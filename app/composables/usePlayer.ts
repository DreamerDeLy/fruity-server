import { reactive, readonly, ref } from 'vue';
import { useStorage } from '@vueuse/core';

type PlayArgs = {
	url: string;
	projectName: string;
	trackName?: string;
	autoplay?: boolean;
};

type PlayerState = {
	currentUrl: string;
	currentProjectName: string;
	currentTrack: string;
	isPlaying: boolean;
	isLoading: boolean;
	hasEnded: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	playRequestId: number;
};

const state = reactive<PlayerState>({
	currentUrl: '',
	currentProjectName: '',
	currentTrack: '',
	isPlaying: false,
	isLoading: false,
	hasEnded: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	playRequestId: 0,
});

const isClient = typeof window !== 'undefined';
const volumeStore = isClient ? useStorage<number>('fruity:volume', 1) : ref(1);

state.volume = clampVolume(volumeStore.value ?? 1);

let audio: HTMLAudioElement | null = null;
let listenersAttached = false;

function clampVolume(value: number): number {
	if (!Number.isFinite(value)) return 1;
	return Math.min(1, Math.max(0, value));
}

function ensureAudio(): HTMLAudioElement | null {
	if (!isClient) return null;
	if (!audio) {
		audio = new Audio();
		audio.crossOrigin = 'anonymous';
		audio.preload = 'metadata';
		audio.volume = state.volume;
	}
	if (!listenersAttached && audio) {
		attachAudioListeners(audio);
		listenersAttached = true;
	}
	return audio;
}

function attachAudioListeners(target: HTMLAudioElement) {
	target.addEventListener('play', () => {
		state.isPlaying = true;
		state.isLoading = false;
		state.hasEnded = false;
	});

	target.addEventListener('pause', () => {
		state.isPlaying = false;
	});

	target.addEventListener('ended', () => {
		state.isPlaying = false;
		state.hasEnded = true;
		state.currentTime = state.duration;
	});

	const updateTime = () => {
		if (!audio) return;
		state.currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
		if (Number.isFinite(audio.duration)) {
			state.duration = audio.duration;
		}
	};

	target.addEventListener('timeupdate', updateTime);
	target.addEventListener('seeked', updateTime);

	target.addEventListener('loadedmetadata', () => {
		if (!audio) return;
		state.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
		state.isLoading = false;
	});

	const markLoading = () => {
		state.isLoading = true;
	};

	const markReady = () => {
		state.isLoading = false;
	};

	target.addEventListener('waiting', markLoading);
	target.addEventListener('stalled', markLoading);
	target.addEventListener('canplay', markReady);
	target.addEventListener('canplaythrough', markReady);
}

function deriveTrackName(url = ''): string {
	try {
		return decodeURIComponent(url).split('/').pop() || '';
	} catch {
		return url;
	}
}

function resetState() {
	state.currentUrl = '';
	state.currentProjectName = '';
	state.currentTrack = '';
	state.currentTime = 0;
	state.duration = 0;
	state.isPlaying = false;
	state.isLoading = false;
	state.hasEnded = false;
	state.playRequestId += 1;
}

function play({ url, projectName, trackName, autoplay = true }: PlayArgs) {
	if (!url) return;
	const media = ensureAudio();
	if (!media) return;

	const sameUrl = state.currentUrl === url;

	state.currentUrl = url;
	state.currentProjectName = projectName;
	state.currentTrack = trackName || deriveTrackName(url);
	state.currentTime = 0;
	state.duration = 0;
	state.hasEnded = false;
	state.isLoading = true;
	state.playRequestId += 1;

	if (!sameUrl || !media.src) {
		media.src = url;
		media.load();
	} else {
		media.currentTime = 0;
	}

	if (autoplay) {
		const promise = media.play();
		if (promise?.catch) {
			promise.catch(() => {
				state.isPlaying = false;
				state.isLoading = false;
			});
		}
	} else {
		media.pause();
	}
}

function toggle() {
	const media = ensureAudio();
	if (!media || !state.currentUrl) return;
	if (media.paused) {
		const promise = media.play();
		if (promise?.catch) promise.catch(() => {});
	} else {
		media.pause();
	}
}

function pause() {
	ensureAudio()?.pause();
}

function resume() {
	const media = ensureAudio();
	if (!media || !state.currentUrl) return;
	const promise = media.play();
	if (promise?.catch) promise.catch(() => {});
}

function stop() {
	const media = ensureAudio();
	if (media) {
		media.pause();
		media.currentTime = 0;
		media.removeAttribute('src');
		media.load();
	}
	resetState();
}

function seekTo(seconds: number) {
	const media = ensureAudio();
	if (!media) return;
	const total = Number.isFinite(media.duration) ? media.duration : state.duration;
	if (!total) return;
	const safe = Math.min(total, Math.max(0, Number.isFinite(seconds) ? seconds : 0));
	media.currentTime = safe;
	state.currentTime = safe;
}

function seekToRatio(ratio: number) {
	const total = state.duration;
	if (!total) return;
	const clampedRatio = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
	seekTo(total * clampedRatio);
}

function setVolume(value: number) {
	const safe = clampVolume(value);
	state.volume = safe;
	if (volumeStore) {
		volumeStore.value = safe;
	}
	const media = ensureAudio();
	if (media) {
		media.volume = safe;
	}
}

export function usePlayer() {
	return {
		state: readonly(state),
		play,
		toggle,
		pause,
		resume,
		stop,
		seekTo,
		seekToRatio,
		setVolume,
	};
}
