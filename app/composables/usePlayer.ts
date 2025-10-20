import { reactive, readonly } from 'vue';

type PlayArgs = {
	url: string;
	projectName: string;
	trackName?: string;
};

const state = reactive({
	currentUrl: '',
	currentProjectName: '',
	currentTrack: '',
	isPlaying: false,
	playRequestId: 0,
});

function deriveTrackName(url = ''): string {
	try {
		return decodeURIComponent(url).split('/').pop() || '';
	} catch {
		return url;
	}
}

function play({ url, projectName, trackName }: PlayArgs) {
	if (!url) return;
	const isSameUrl = state.currentUrl === url;

	state.currentUrl = url;
	state.currentProjectName = projectName;
	state.currentTrack = trackName || deriveTrackName(url);
	state.isPlaying = true;
	state.playRequestId = isSameUrl ? state.playRequestId + 1 : state.playRequestId;
}

function stop() {
	state.currentUrl = '';
	state.currentProjectName = '';
	state.currentTrack = '';
	state.isPlaying = false;
	state.playRequestId = 0;
}

function setIsPlaying(value: boolean) {
	state.isPlaying = value;
}

export function usePlayer() {
	return {
		state: readonly(state),
		play,
		stop,
		setIsPlaying,
	};
}
