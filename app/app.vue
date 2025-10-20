<template>
	<div class="flex flex-col h-screen overflow-hidden">

		<!-- Header -->

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

		<!-- Main content -->
		 
		<div 
			class="grow grid grid-cols-[minmax(280px,_20%)_minmax(420px,_25%)_1fr] overflow-hidden"
		>
			<div 
				class="flex flex-col gap-2 overflow-y-auto border-gray-700 border-r p-4"
			>
				<h3 class="text-lg font-bold mb-2">
					Folders
				</h3>

				<FolderPanel
					v-for="f in folders"
					:key="f.name"
					:folder="f"
					:selected="selectedFolder?.name == f.name"
					@click="selectFolder(f)"
					class="shrink-0"
				/>

				<div class="flex items-center justify-center mt-4">
					<button 
						class="flex gap-1"
						@click="showAddFolder = true"
					>
						Add folder
						<LucidePlus :size="16" />
					</button>
				</div>

				<AddFolderModal v-model="showAddFolder" @add-folder="addFolder"/>
			</div>

			<div class="flex flex-col gap-2 overflow-y-auto overflow-x-hidden border-gray-700 border-r p-4">
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
					class="flex flex-col gap-2 relative w-full"
				>
					<div 
						v-if="projectsLoading" 
						class="absolute w-full h-full text-center text-gray-500 bg-white/5 rounded-lg pointer-events-none"
					>
					</div>

					<ProjectPanel 
						v-for="p in filteredProjects" 
						:key="p.name" 
						:data-current="p.name === player.state.currentProjectName ? true : null"
						:project="p"
					/>
				</div>
			</div>

			<div class="p-6">
				<ProjectInfo :project="currentProject" v-if="currentProject" />
			</div>
		</div>

		<!-- Player -->

		<Transition name="slide-up">
					<PlayerBar v-if="player.state.currentUrl" />
		</Transition>
	</div>
</template>

<script setup>
import { LucidePlus } from 'lucide-vue-next';
import { usePlayer } from '~/composables/usePlayer';

const player = usePlayer();

const folders = ref([]);
const projects = ref([]);

const selectedFolder = ref(null);
const showAddFolder = ref(false);

const projectsLoading = ref(false);

const searchText = ref("");

const currentProject = computed(() =>
	projects.value.find(p => p.name === player.state.currentProjectName) || null
);

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

	if (text.startsWith("with:")) {
		const withText = text.slice(5).trim().toLowerCase();
		if (withText === "mp3") {
			return projects.value.filter(p => p.mp3s.length > 0);
		}
		if (withText === "legacy") {
			return projects.value.filter(p => p.legacy);
		}
		if (withText === "nolegacy" || withText === "no-legacy" || withText === "no legacy") {
			return projects.value.filter(p => !p.legacy);
		}
		return projects.value;
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

async function selectFolder(folder) {
	selectedFolder.value = folder;
	await loadProjects();
}

async function addFolder(newFolderName, newFolderPath) {
	if (!newFolderName.trim() || !newFolderPath.trim()) return;

	try {
		await $fetch("/api/folders", {
			method: "POST",
			body: {
				name: newFolderName.trim(),
				path: newFolderPath.trim()
			}
		});

		// Reload folders
		folders.value = await $fetch("/api/folders");

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
</style>
