<template>
	<div class="flex flex-col max-h-screen overflow-hidden">
		<div class="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
			<div>
				<h2 class="text-2xl font-bold mb-0">FruityServer</h2>
				<small>All your shit in one place</small>
			</div>
			<div class="flex gap-4 [&>div]:p-1 [&>div]:text-center [&>div>div]:font-bold">
				<div>
					<div>{{ projects.length }}</div>
					<small>Projects</small>
				</div>
				<div>
					<div>{{ projects.filter(p => p.mp3s.length > 0).length }}</div>
					<small>With MP3s</small>
				</div>
			</div>
		</div>

		<div class="grow flex flex-row overflow-hidden">
			<div class="max-w-[520px] flex flex-col gap-2 overflow-y-auto border-gray-700 border-r p-4">
				<ProjectPanel 
					v-for="p in projects" 
					:key="p.name" 
					:data-current="p.name == currentProjectName ? true : null"
					:project="p"
					@play="play"
				/>
			</div>
			<div class="p-6">
				<!-- Placeholder for future content -->
				<h1>{{ currentProjectName ?? "Song name" }}</h1>
				<p>Artist: {{ currentProject?.flps[0]?.artist ?? "-" }}</p>
				<p>
					Dates: 
					<span v-if="currentProject?.flps?.length > 1">
						{{ currentProject.flps[0].ctime.substring(0, 10) }} - {{ currentProject.flps[currentProject.flps.length - 1].ctime.substring(0, 10) }}
					</span>
					<span v-else>
						{{ currentProject?.flps?.[0]?.ctime?.substring(0, 10) ?? "-" }}
					</span>
				</p>
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
				:subtitle="currentProjectName"
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
import ProjectPanel from './components/ProjectPanel.vue';

const projects = ref([]);
const currentUrl = ref("");
const currentProject = ref(null);
const currentProjectName = ref("");
const currentTrack = ref("");
const player = ref(null);
const isPlaying = ref(false);

onMounted(async () => {
	const res = await $fetch("/api/projects");
	projects.value = res;

	projects.value.sort((a, b) => {
		const dateA = a.date_prefix ? new Date(a.date_prefix) : new Date(0);
		const dateB = b.date_prefix ? new Date(b.date_prefix) : new Date(0);
		return dateB.getTime() - dateA.getTime();
	});
});

async function play(url, project, trackName = "") {
	if (!url) return;
	const assignSource = () => {
		currentUrl.value = url;
		currentProjectName.value = project;
		currentTrack.value = trackName || deriveTrackName(url);

		currentProject.value = projects.value.find(p => p.name === project) || null;
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
	currentProjectName.value = "";
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
