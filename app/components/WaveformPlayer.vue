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
			<input type="range" min="0" max="1" step="0.01" v-model.number="volume" class="flex-1 accent-purple-500" />
		</label>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { usePlayer } from '~/composables/usePlayer';

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

const player = usePlayer();
const isClient = typeof window !== 'undefined';

const waveCanvas = ref<HTMLCanvasElement | null>(null);
const progressRef = ref<HTMLElement | null>(null);
const progressState = reactive({ state: '', label: '' });

const volume = computed({
	get: () => player.state.volume,
	set: value => player.setVolume(value),
});

const formattedCurrent = computed(() => formatTime(player.state.currentTime));
const formattedDuration = computed(() => formatTime(player.state.duration));

const waveformCache = new Map<string, WaveformData>();

let waveCtx: CanvasRenderingContext2D | null = null;
let audioContext: AudioContext | null = null;
let currentWaveform: WaveformData | null = null;
let pendingWaveformUrl: string | null = null;
let frameRequested = false;

onMounted(() => {
	window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
	window.removeEventListener('resize', handleResize);
});

watch(
	() => props.src,
	async src => {
		if (!isClient) {
			currentWaveform = null;
			pendingWaveformUrl = null;
			setWaveformState('', '');
			return;
		}

		currentWaveform = null;
		pendingWaveformUrl = src || null;
		if (!src) {
			setWaveformState('', '');
			clearWaveform();
			return;
		}

		setWaveformState('loading', 'Loading waveform…');
		clearWaveform();

		await nextTick();
		await loadWaveformForUrl(src);
	},
	{ immediate: true }
);

watch(
	() => player.state.playRequestId,
	() => {
		if (!isClient) return;
		scheduleWaveformDraw(true);
	}
);

watch(
	() => player.state.currentTime,
	() => {
		if (!isClient) return;
		scheduleWaveformDraw();
		emit('timeupdate', { currentTime: player.state.currentTime, duration: player.state.duration });
	}
);

watch(
	() => player.state.duration,
	() => {
		if (!isClient) return;
		scheduleWaveformDraw(true);
	}
);

watch(
	() => player.state.isPlaying,
	(value, previous) => {
		if (!isClient) return;
		if (value && !previous) {
			emit('play');
		} else if (!value && previous) {
			emit('pause');
			if (player.state.hasEnded) {
				emit('ended');
			}
		}
		scheduleWaveformDraw();
	}
);

function setWaveformState(state: string | null, label = '') {
	progressState.state = state || '';
	progressState.label = label || '';
}

function getEffectiveDuration(): number {
	const audioDuration = player.state.duration;
	if (Number.isFinite(audioDuration) && audioDuration > 0) return audioDuration;
	if (currentWaveform?.duration && Number.isFinite(currentWaveform.duration)) return currentWaveform.duration;
	return 0;
}

function getPlaybackRatio(): number {
	const total = getEffectiveDuration();
	if (!total) return 0;
	return Math.min(1, Math.max(0, player.state.currentTime / total));
}

async function loadWaveformForUrl(url: string) {
	if (!isClient) return;
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
	if (!isClient) {
		throw new Error('AudioContext unsupported');
	}
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
	if (!isClient) return null;
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
	if (!isClient) return;
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
	if (!isClient) return;
	if (!currentWaveform) return;
	scheduleWaveformDraw(true);
}

function onSeek(event: MouseEvent) {
	if (!isClient) return;
	if (!progressRef.value) return;
	const rect = progressRef.value.getBoundingClientRect();
	if (!rect.width) return;
	const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
	player.seekToRatio(ratio);
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
