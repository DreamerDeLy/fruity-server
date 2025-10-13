<template>
	<div class="flex flex-col max-h-screen overflow-hidden">
		<div class="bg-gray-900 border-b border-gray-700 p-4">
			<h2 class="text-2xl font-bold mb-0">FruityServer</h2>
			<small>All your shit in one place</small>
		</div>

		<div class="grow flex flex-row overflow-hidden">
			<div class="max-w-lg flex flex-col gap-2 overflow-y-auto border-gray-700 border-r p-4">
				<div 
					v-for="p in projects" 
					:key="p.name" 
					class="bg-gray-800 p-4 rounded-lg data-current:bg-gray-700"
					:data-current="p.name == currentProject ? true : null"
				>
					<div class="flex justify-between items-center mb-2">
						<div>
							<h3 class="font-semibold">{{ p.name }}</h3>
							<small class="text-gray-400">{{ p.mp3s.length }} mp3</small>
						</div>
						<button 
							class="bg-purple-600 w-8 h-8 rounded-full" 
							@click="play(p.last?.url, p.name, p.last?.name)" v-if="p.last"
						>
							<font-awesome :icon="faPlay" />
						</button>
					</div>

					<ul>
						<li v-for="m in p.mp3s" :key="m.name" class="flex justify-between">
							<span>{{ m.name }}</span>
							<button 
								class="w-8 h-8 rounded-full" 
								@click="play(m.url, p.name, m.name)"
							>
								<font-awesome :icon="faPlay" />
							</button>
						</li>
					</ul>
				</div>
			</div>
			<div class="p-6">
				<!-- Placeholder for future content -->
				<h1>{{ currentProject ?? "Song name" }}</h1>
				<p>Artist</p>
				<p>Year</p>
				<p>Genre</p>
			</div>
		</div>

		<footer v-if="currentUrl"
			class="bg-gray-900 border-t border-gray-700 flex flex-wrap items-center gap-4 p-3"
		>

			<div class="flex gap-2">
				<button
					class="bg-purple-600 hover:bg-purple-500 transition-colors rounded-full p-3 text-white w-12 h-12 flex items-center justify-center"
					@click="togglePlay"
				>
					<font-awesome :icon="isPlaying ? faPause : faPlay" />
				</button>
				<button
					class="bg-gray-800 hover:bg-gray-700 transition-colors rounded-full p-3 text-white w-12 h-12 flex items-center justify-center"
					@click="stopPlayback"
				>
					<font-awesome :icon="faStop" />
				</button>
			</div>
			<WaveformPlayer
				ref="player"
				class="flex-1 min-w-[260px]"
				:src="currentUrl"
				:title="currentTrack"
				:subtitle="currentProject"
				autoplay
				@play="isPlaying = true"
				@pause="isPlaying = false"
				@ended="isPlaying = false"
			/>

			
		</footer>
	</div>
</template>

<script setup>
import { faPause, faPlay, faStop } from '@fortawesome/free-solid-svg-icons'
import WaveformPlayer from './components/WaveformPlayer.vue'

const projects = ref([]);
const currentUrl = ref("");
const currentProject = ref("");
const currentTrack = ref("");
const player = ref(null);
const isPlaying = ref(false);

onMounted(async () => {
	const res = await $fetch("/api/projects");
	projects.value = res;
});

async function play(url, project, trackName = "") {
	if (!url) return;
	const assignSource = () => {
		currentUrl.value = url;
		currentProject.value = project;
		currentTrack.value = trackName || deriveTrackName(url);
	};

	if (currentUrl.value === url) {
		player.value?.stop();
		currentUrl.value = "";
		await nextTick();
		assignSource();
	} else {
		assignSource();
	}
	isPlaying.value = true;
}

function togglePlay() {
	player.value?.toggle();
}

function stopPlayback() {
	player.value?.stop();
	currentUrl.value = "";
	currentProject.value = "";
	currentTrack.value = "";
	isPlaying.value = false;
}

function deriveTrackName(url = "") {
	try {
		return decodeURIComponent(url).split("/").pop() || "";
	} catch (err) {
		return url;
	}
}
</script>

<style></style>
