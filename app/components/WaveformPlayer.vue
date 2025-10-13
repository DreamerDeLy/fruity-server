<template>
  <div class="flex w-full flex-col gap-2" v-if="src">
    <div class="flex flex-col">
      <span v-if="title" class="text-sm font-semibold text-gray-100">{{ title }}</span>
      <span v-if="subtitle" class="text-xs text-gray-400">{{ subtitle }}</span>
    </div>

    <div
      ref="progressRef"
      class="relative flex h-20 w-full cursor-pointer items-center overflow-hidden rounded-xl bg-gray-800/80 transition-colors hover:bg-gray-700/80"
      @click="onSeek"
    >
      <canvas ref="waveCanvas" class="block h-full w-full"></canvas>
      <div
        v-if="progressState.state"
        class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400"
      >
        {{ progressState.label }}
      </div>
    </div>

    <div class="flex items-center justify-between text-xs text-gray-400">
      <span>{{ formattedCurrent }}</span>
      <span>{{ formattedDuration }}</span>
    </div>

    <label class="flex items-center gap-3 text-xs text-gray-300">
      <span>Volume</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        v-model.number="volume"
        class="flex-1 accent-purple-500"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

type Peak = { min: number; max: number };
type WaveformData = { peaks: Peak[]; duration: number };

const props = defineProps({
  src: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  autoplay: { type: Boolean, default: true },
  accent: { type: String, default: '#8b5cf6' },
  accentAlt: { type: String, default: '#06b6d4' },
});

const emit = defineEmits<{
  (e: 'play'): void;
  (e: 'pause'): void;
  (e: 'ended'): void;
  (e: 'timeupdate', payload: { currentTime: number; duration: number }): void;
}>();

const waveCanvas = ref<HTMLCanvasElement | null>(null);
const progressRef = ref<HTMLElement | null>(null);
const volume = ref(1);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progressState = reactive({ state: '', label: '' });

const waveformCache = new Map<string, WaveformData>();

let audio: HTMLAudioElement | null = null;
let waveCtx: CanvasRenderingContext2D | null = null;
let audioContext: AudioContext | null = null;
let currentWaveform: WaveformData | null = null;
let pendingWaveformUrl: string | null = null;
let frameRequested = false;
let stopSourceWatch: (() => void) | null = null;
let stopVolumeWatch: (() => void) | null = null;

const formattedCurrent = computed(() => formatTime(currentTime.value));
const formattedDuration = computed(() => formatTime(duration.value));

function setWaveformState(state: string | null, label = '') {
  progressState.state = state || '';
  progressState.label = label || '';
}

function getEffectiveDuration(): number {
  const audioDuration = audio?.duration ?? NaN;
  if (Number.isFinite(audioDuration) && audioDuration > 0) return audioDuration;
  if (Number.isFinite(duration.value) && duration.value > 0) return duration.value;
  if (currentWaveform?.duration && Number.isFinite(currentWaveform.duration)) return currentWaveform.duration;
  return 0;
}

function getPlaybackRatio(): number {
  const total = getEffectiveDuration();
  if (!total) return 0;
  const position = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : currentTime.value;
  return Math.min(1, Math.max(0, position / total));
}

onMounted(() => {
  audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'metadata';

  audio.addEventListener('play', handlePlay);
  audio.addEventListener('pause', handlePause);
  audio.addEventListener('ended', handleEnded);
  audio.addEventListener('loadedmetadata', handleLoadedMetadata);
  audio.addEventListener('timeupdate', handleTimeUpdate);
  audio.addEventListener('seeked', handleTimeUpdate);

  window.addEventListener('resize', handleResize);

  stopSourceWatch = watch(
    () => props.src,
    async src => {
      if (!audio) return;
      await handleSourceChange(src);
    },
    { immediate: true }
  );

  stopVolumeWatch = watch(
    volume,
    v => {
      if (!audio) return;
      const next = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
      audio.volume = next;
    },
    { immediate: true }
  );
});

onUnmounted(() => {
  stopSourceWatch?.();
  stopVolumeWatch?.();

  window.removeEventListener('resize', handleResize);

  if (audio) {
    audio.pause();
    audio.src = '';
    audio.removeAttribute('src');
    audio.load();
    audio.removeEventListener('play', handlePlay);
    audio.removeEventListener('pause', handlePause);
    audio.removeEventListener('ended', handleEnded);
    audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    audio.removeEventListener('timeupdate', handleTimeUpdate);
    audio.removeEventListener('seeked', handleTimeUpdate);
    audio = null;
  }
});

function togglePlay() {
  if (!audio || !props.src) return;
  if (audio.paused) {
    playAudio();
  } else {
    pauseAudio();
  }
}

function playAudio() {
  if (!audio || !props.src) return;
  const promise = audio.play();
  if (promise?.catch) promise.catch(() => {});
}

function pauseAudio() {
  if (!audio) return;
  audio.pause();
}

function stop() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  handleTimeUpdate();
}

defineExpose({
  play: playAudio,
  pause: pauseAudio,
  toggle: togglePlay,
  stop,
  isPlaying,
});

async function handleSourceChange(src: string) {
  if (!audio) return;

  currentWaveform = null;
  pendingWaveformUrl = src || null;
  currentTime.value = 0;
  duration.value = 0;
  setWaveformState('', '');
  clearWaveform();

  if (!src) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    return;
  }

  audio.src = src;
  audio.load();

  if (props.autoplay) {
    const promise = audio.play();
    if (promise?.catch) promise.catch(() => {});
  }

  await nextTick();
  await loadWaveformForUrl(src);
}

async function loadWaveformForUrl(url: string) {
  if (!url) return;
  if (!waveCanvas.value) return;

  pendingWaveformUrl = url;
  currentWaveform = null;
  setWaveformState('loading', 'Loading waveform…');
  ensureWaveCanvas();

  try {
    const data = await getWaveformData(url);
    if (pendingWaveformUrl !== url) return;
    currentWaveform = data;
    setWaveformState('', '');
    if (!Number.isFinite(duration.value) || duration.value <= 0) {
      duration.value = Number.isFinite(data.duration) ? data.duration : 0;
    }
    scheduleWaveformDraw(true);
    pendingWaveformUrl = null;
  } catch (err) {
    if (pendingWaveformUrl === url) {
      console.error('Waveform render error', err);
      setWaveformState('error', 'Waveform error');
      pendingWaveformUrl = null;
    }
  }
}

async function getWaveformData(url: string): Promise<WaveformData> {
  if (waveformCache.has(url)) {
    return waveformCache.get(url)!;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Waveform fetch failed');
  }

  const arrayBuffer = await response.arrayBuffer();
  const ctx = await ensureAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  const peaks = extractPeaks(audioBuffer, getWaveformResolution());
  const data: WaveformData = { peaks, duration: audioBuffer.duration };
  waveformCache.set(url, data);
  return data;
}

async function ensureAudioContext(): Promise<AudioContext> {
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch {
        /* noop */
      }
    }
    return audioContext;
  }

  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) {
    throw new Error('AudioContext unsupported');
  }
  audioContext = new Ctx();
  return audioContext;
}

function mergeChannels(buffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = buffer;
  if (numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const result = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const base = result[i] ?? 0;
      const addition = channelData[i] ?? 0;
      result[i] = base + addition;
    }
  }
  for (let i = 0; i < length; i++) {
    const base = result[i] ?? 0;
    result[i] = base / numberOfChannels;
  }
  return result;
}

function extractPeaks(buffer: AudioBuffer, bucketCount: number): Peak[] {
  const samples = mergeChannels(buffer);
  if (!samples.length) return [];
  const totalBuckets = Math.min(bucketCount, samples.length);
  if (!totalBuckets) return [];
  const bucketSize = Math.floor(samples.length / totalBuckets) || 1;
  const peaks = new Array(totalBuckets) as Peak[];
  for (let i = 0; i < totalBuckets; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, samples.length);
    let min = 1;
    let max = -1;
    for (let j = start; j < end; j++) {
      const value = samples[j] ?? 0;
      if (value > max) max = value;
      if (value < min) min = value;
    }
    peaks[i] = { min, max };
  }
  return peaks;
}

function getWaveformResolution(): number {
  const width = waveCanvas.value?.clientWidth || 800;
  return Math.max(400, Math.min(1600, Math.round(width * 2)));
}

function ensureWaveCanvas(): { width: number; height: number } | null {
  const canvas = waveCanvas.value;
  if (!canvas) return null;
  if (!waveCtx) {
    waveCtx = canvas.getContext('2d');
  }
  if (!waveCtx) return null;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return null;

  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  waveCtx.setTransform(1, 0, 0, 1, 0, 0);
  waveCtx.scale(dpr, dpr);
  waveCtx.clearRect(0, 0, width, height);

  return { width, height };
}

function clearWaveform() {
  if (!waveCtx || !waveCanvas.value) return;
  const metrics = ensureWaveCanvas();
  if (!metrics) return;
  waveCtx.clearRect(0, 0, metrics.width, metrics.height);
}

function drawWaveform(data: WaveformData, progress = 0) {
  if (!data || !data.peaks || !data.peaks.length) return;
  const metrics = ensureWaveCanvas();
  if (!metrics || !waveCtx) return;
  const { width, height } = metrics;
  const peaks = data.peaks;
  const barCount = peaks.length;
  const barWidth = width / barCount;
  const gap = Math.min(2, barWidth * 0.35);
  const drawWidth = Math.max(1, barWidth - gap);
  const verticalPadding = 6;

  const bars = new Array<number>(barCount);
  for (let i = 0; i < barCount; i++) {
    const peak = peaks[i];
    const { min, max } = peak ?? { min: 0, max: 0 };
    const amplitude = Math.max(Math.abs(min), Math.abs(max));
    bars[i] = Math.max(2, amplitude * (height - verticalPadding * 2));
  }

  waveCtx.fillStyle = 'rgba(148, 163, 184, 0.38)';
  for (let i = 0; i < barCount; i++) {
    const barHeight = bars[i] ?? 2;
    const x = i * barWidth + gap / 2;
    const y = (height - barHeight) / 2;
    waveCtx.fillRect(x, y, drawWidth, barHeight);
  }

  const ratio = Math.min(1, Math.max(0, progress || 0));
  if (ratio <= 0) return;

  const gradient = waveCtx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, props.accent);
  gradient.addColorStop(1, props.accentAlt);
  waveCtx.fillStyle = gradient;

  const total = ratio * barCount;
  const fullBars = Math.floor(total);
  for (let i = 0; i < fullBars && i < barCount; i++) {
    const barHeight = bars[i] ?? 2;
    const x = i * barWidth + gap / 2;
    const y = (height - barHeight) / 2;
    waveCtx.fillRect(x, y, drawWidth, barHeight);
  }

  const remaining = total - fullBars;
  if (remaining > 0 && fullBars < barCount) {
    const barHeight = bars[fullBars] ?? 2;
    const x = fullBars * barWidth + gap / 2;
    const y = (height - barHeight) / 2;
    waveCtx.fillRect(x, y, drawWidth * remaining, barHeight);
  }
}

function scheduleWaveformDraw(force = false) {
  if (!currentWaveform) return;
  if (frameRequested && !force) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    if (!currentWaveform) return;
    drawWaveform(currentWaveform, getPlaybackRatio());
  });
}

function handleResize() {
  if (!currentWaveform) return;
  scheduleWaveformDraw(true);
}

function handlePlay() {
  isPlaying.value = true;
  emit('play');
  scheduleWaveformDraw();
}

function handlePause() {
  isPlaying.value = false;
  emit('pause');
  scheduleWaveformDraw();
}

function handleEnded() {
  isPlaying.value = false;
  emit('ended');
  scheduleWaveformDraw();
}

function handleLoadedMetadata() {
  if (!audio) return;
  duration.value = Number.isFinite(audio.duration) ? audio.duration : 0;
  scheduleWaveformDraw(true);
}

function handleTimeUpdate() {
  if (!audio) return;
  currentTime.value = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  if (Number.isFinite(audio.duration)) {
    duration.value = audio.duration;
  }
  scheduleWaveformDraw();
  emit('timeupdate', { currentTime: currentTime.value, duration: duration.value });
}

function onSeek(event: MouseEvent) {
  if (!progressRef.value) return;
  const rect = progressRef.value.getBoundingClientRect();
  if (!rect.width) return;
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const total = getEffectiveDuration();
  if (!total) return;
  const target = ratio * total;
  if (audio) {
    audio.currentTime = target;
  }
  currentTime.value = target;
  scheduleWaveformDraw(true);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  const min = Math.floor(whole / 60);
  const sec = whole % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
/* Fallback for data-label overlay when Tailwind classes are unavailable */
</style>
