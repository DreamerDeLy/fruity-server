<template>
	<div class="flex flex-col h-screen overflow-hidden">
		<div class="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
			<div class="flex items-center gap-1">
				<img src="~/assets/FruityServer Logo 1.svg" alt="logo" class="invert w-12 h-12 mb-1">
				<div>
					<h2 class="text-2xl font-bold mb-0">FruityServer</h2>
					<small>All your shit in one place</small>
				</div>
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

		<div class="grow grid grid-cols-[minmax(280px,_20%)_minmax(420px,_25%)_1fr] overflow-hidden">
			<div class="flex flex-col gap-2 overflow-y-auto border-gray-700 border-r p-4">
				<h3 class="text-lg font-bold mb-2">
					Folders
				</h3>

				<div
					v-for="f in folders"
					:key="f.name" 
					class="
						bg-gray-800 
						hover:bg-gray-700
						data-selected:bg-gray-700 
						rounded-lg 
						flex items-center justify-between 
						cursor-pointer 
						transition-colors 
						overflow-hidden
						hover:[&>div:nth-child(2)]:translate-x-1
						data-selected:[&>div:nth-child(2)]:translate-x-1
					"
					:class="{ 'bg-gray-700': selectedFolder?.name === f.name }"
					@click="selectFolder(f)"
					:data-selected="selectedFolder?.name === f.name ? true : null"
				>
					<div class="flex items-center gap-3 p-2 truncate">
						<div class="w-16 h-16 bg-gray-900 rounded shrink-0 flex items-center justify-center overflow-hidden">
							<img 
								v-if="f.cover" 
								:src="f.cover" alt="cover"
								class="w-full h-full object-cover"
							>
							<LucideFolder v-else class="text-gray-500"/>
						</div>

						<h3>{{ f.name }}</h3>
					</div>

					<div class="p-4 h-full shrink-0 flex items-center justify-center transition-transform">
						<LucideChevronRight />
					</div>
				</div>

				<div class="flex items-center justify-center mt-4">
					<button 
						class="flex gap-1"
						@click="showAddFolder = true"
					>
						Add folder<LucidePlus :size="16" />
					</button>
				</div>
			</div>

			<div class="flex flex-col gap-2 overflow-y-auto border-gray-700 border-r p-4">
				<h3 class="text-lg font-bold mb-2">
					Projects
				</h3>

				<div class="mb-2">
					<input 
						class="rounded bg-gray-800 w-full py-1 px-2" 
						type="text" 
						placeholder="Search..."
						v-model="searchText"
					>
				</div>

				<div
					class="flex flex-col gap-2 relative"
				>
					<div 
						v-if="projectsLoading" 
						class="absolute w-full h-full text-center text-gray-500 bg-white/5 rounded-lg pointer-events-none"
					>
					</div>

					<ProjectPanel 
						v-for="p in filteredProjects" 
						:key="p.name" 
						:data-current="p.name == currentProjectName ? true : null"
						:project="p"
						@play="play"
					/>
				</div>
			</div>

			<div class="p-6">
				<div class="flex gap-5">
					<div class="w-48 aspect-square rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
						<img
							v-if="false" 
							src="" 
							alt="cover" 
							class="w-full h-full object-cover"
						>
						<div>
							<font-awesome :icon="faMusic" class="text-3xl text-gray-500" />
						</div>
					</div>
					<div>
						<h1>{{ currentProjectName == null || currentProjectName.length < 1 ? "Song name" : currentProjectName }}</h1>
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
			</div>
		</div>

		<Transition name="slide-up">
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
		</Transition>
	</div>

	<!-- Add Folder Modal -->
	<Transition name="fade">
		<div v-if="showAddFolder" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-gray-800 rounded-lg p-6 w-96">
				<h3 class="text-lg font-bold mb-4">Add New Folder</h3>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">Folder Name</label>
					<input 
						v-model="newFolderName"
						class="w-full bg-gray-700 rounded px-3 py-2"
						type="text" 
						placeholder="Enter folder name"
					>
				</div>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">Folder Path</label>
					<input 
						v-model="newFolderPath"
						class="w-full bg-gray-700 rounded px-3 py-2"
						type="text" 
						placeholder="Enter folder path"
					>
				</div>
				<div class="flex gap-2 justify-end">
					<button 
						class="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded"
						@click="showAddFolder = false"
					>
						Cancel
					</button>
					<button 
						class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
						@click="addFolder"
					>
						Add
					</button>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup>
import { faPause, faPlay, faStop, faMusic, faFolder } from '@fortawesome/free-solid-svg-icons'
import WaveformPlayer from './components/WaveformPlayer.vue'
import ProjectPanel from './components/ProjectPanel.vue';
import { LucideFolder, LucideChevronRight, LucidePlus } from 'lucide-vue-next';

const folders = ref([]);
const projects = ref([]);
const currentUrl = ref("");
const currentProject = ref(null);
const currentProjectName = ref("");
const currentTrack = ref("");
const player = ref(null);
const isPlaying = ref(false);
const selectedFolder = ref(null);
const showAddFolder = ref(false);
const newFolderName = ref("");
const newFolderPath = ref("");

const projectsLoading = ref(false);

const searchText = ref("");
const filteredProjects = computed(() => {
	const text = searchText.value.trim();
	
	if (!text) return projects.value;


	if (text.startsWith("folder:")) {
		const folderToSearch = text.slice(7).trim().toLowerCase();
		return projects.value.filter(p => {
			const parentFolder = p.parentPath.toLowerCase().split("\\").at(-1) || "";
			return parentFolder.includes(folderToSearch);
		});
	}

	return projects.value.filter(p => 
		p.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
		(p.flps[0]?.artist && p.flps[0].artist.toLowerCase().includes(searchText.value.toLowerCase())) ||
		p.mp3s.some(m => m.name.toLowerCase().includes(searchText.value.toLowerCase()))
	);
});

onMounted(async () => {
	folders.value = await $fetch("/api/folders");
	if (folders.value.length > 0) {
		selectedFolder.value = folders.value[0];
		await loadProjects();
	}
});

async function loadProjects() {
	if (!selectedFolder.value) return;
	projectsLoading.value = true;
	const res = await $fetch(`/api/projects?folder=${encodeURIComponent(selectedFolder.value.name)}`);
	projects.value = res;

	projects.value.sort((a, b) => {
		const dateA = a.date_prefix ? new Date(a.date_prefix) : new Date(0);
		const dateB = b.date_prefix ? new Date(b.date_prefix) : new Date(0);
		return dateB.getTime() - dateA.getTime();
	});

	projectsLoading.value = false;
}

async function play(url, project, trackName = "") {
	console.log("Play", { url, project, trackName });

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

async function selectFolder(folder) {
	selectedFolder.value = folder;
	await loadProjects();
}

async function addFolder() {
	if (!newFolderName.value.trim() || !newFolderPath.value.trim()) return;

	try {
		await $fetch("/api/folders", {
			method: "POST",
			body: {
				name: newFolderName.value.trim(),
				path: newFolderPath.value.trim()
			}
		});

		// Reload folders
		folders.value = await $fetch("/api/folders");

		// Reset form
		newFolderName.value = "";
		newFolderPath.value = "";
		showAddFolder.value = false;
	} catch (error) {
		alert("Error adding folder: " + error.message);
	}
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
}

.slide-up-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
}

.fade-leave-to {
  opacity: 0;
}
</style>
