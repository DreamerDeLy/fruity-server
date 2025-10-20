<template>
	<footer v-if="player.state.currentUrl"
		class="bg-gray-900 border-t border-gray-700 flex flex-wrap items-center gap-4 p-3"
	>
		<div class="flex gap-2">
			<button
				class="bg-purple-600 hover:bg-purple-500 transition-colors rounded-full p-3 text-white w-12 h-12 flex items-center justify-center"
				@click="togglePlay"
			>
				<font-awesome :icon="player.state.isPlaying ? faPause : faPlay" />
			</button>
			<button
				class="bg-gray-800 hover:bg-gray-700 transition-colors rounded-full p-3 text-white w-12 h-12 flex items-center justify-center"
				@click="stopPlayback"
			>
				<font-awesome :icon="faStop" />
			</button>
		</div>

		<WaveformPlayer 
			:key="playKey" 
			class="flex-1 min-w-[260px]" 
			:src="player.state.currentUrl"
			:title="player.state.currentTrack" 
			:subtitle="player.state.currentProjectName" 
			autoplay
		/>
	</footer>
</template>

<script setup>
import { computed } from 'vue';
import { faPause, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '~/composables/usePlayer';

const player = usePlayer();
const playKey = computed(() => `${player.state.currentUrl}#${player.state.playRequestId}`);

function togglePlay() {
	player.toggle();
}

function stopPlayback() {
	player.stop();
}
</script>
