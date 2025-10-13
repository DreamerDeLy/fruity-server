<template>
	<div class="flex flex-col max-h-screen overflow-hidden">
		<div class="bg-gray-900 border-b border-gray-700 p-4">
			<h2 class="text-2xl font-bold mb-0">FruityServer</h2>
			<small>All your shit in one place</small>
		</div>

		<div class="grow flex flex-row overflow-hidden">
			<div class="max-w-lg flex flex-col gap-2 overflow-y-auto border-gray-700 border-r p-4">
				<div v-for="p in projects" :key="p.name" class="bg-gray-800 p-4 rounded-lg">
					<div class="flex justify-between items-center mb-2">
						<div>
							<h3 class="font-semibold">{{ p.name }}</h3>
							<small class="text-gray-400">{{ p.mp3s.length }} mp3</small>
						</div>
						<button class="bg-purple-600 px-3 py-1 rounded" @click="play(p.last?.url, p.name)" v-if="p.last">
							<font-awesome :icon="faPlay" />
						</button>
					</div>

					<ul>
						<li v-for="m in p.mp3s" :key="m.name" class="flex justify-between">
							<span>{{ m.name }}</span>
							<button @click="play(m.url, p.name)">
								<font-awesome :icon="faPlay" />
							</button>
						</li>
					</ul>
				</div>
			</div>
			<div class="p-6">
				<!-- Placeholder for future content -->
				<h1>Song Name</h1>
				<p>Artist</p>
				<p>Year</p>
				<p>Genre</p>
			</div>
		</div>

		<footer v-if="currentUrl"
			class="bg-gray-900 border-t border-gray-700 flex items-center gap-3 p-3"
		>
			<audio ref="player" :src="currentUrl" controls autoplay class="flex-1"></audio>
			<div class="text-sm text-gray-400">{{ currentProject }}</div>
		</footer>
	</div>
</template>

<script setup>
import { faPlay } from '@fortawesome/free-solid-svg-icons'

const projects = ref([]);
const currentUrl = ref("");
const currentProject = ref("");
const player = ref(null);

onMounted(async () => {
	const res = await $fetch("/api/projects");
	projects.value = res;
});

function play(url, project) {
	currentUrl.value = url;
	currentProject.value = project;
}
</script>

<style></style>
