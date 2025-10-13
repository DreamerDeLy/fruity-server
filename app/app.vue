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
					:data-current="p.name == currentProjectName ? true : null"
				>
					<div class="flex justify-between items-center mb-4">
						<div>
							<h3 class="font-semibold mb-2">{{ p.name }}</h3>

							<div class="flex gap-1.5">
								<div 
									class="border border-sky-700 bg-sky-900 rounded px-1 py-0.5 text-sm"
								>
									{{ p.mp3s.length }} mp3
								</div>
								<div 
									v-if="p.flps[0].bpm" 
									class="border border-emerald-700 bg-emerald-900 rounded px-1 py-0.5 text-sm"
								>
									{{ p.flps[0].bpm + " bpm" }}
								</div>
								<div 
									v-if="p.flps[0].version" 
									class="border border-yellow-700 bg-yellow-900 rounded px-1 py-0.5 text-sm"
								>
									{{ "v" + p.flps[0].version }}
								</div>
							</div>
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
