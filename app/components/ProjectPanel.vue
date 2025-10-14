<template>
	<div 
		class="bg-gray-800 p-4 rounded-lg data-current:bg-gray-700"
	>
		<div class="flex justify-between items-center mb-4">
			<div>
				<h3 class="font-bold mb-2 text-lg">{{ project.name }}</h3>

				<div class="flex gap-1.5">
					<div 
						class="border border-sky-700 bg-sky-900 rounded px-1 py-0.5 text-sm"
					>
						x{{ project.mp3s.length }} mp3
					</div>
					<div 
						v-if="project.flps[0].bpm" 
						class="border border-emerald-700 bg-emerald-900 rounded px-1 py-0.5 text-sm"
					>
						{{ project.flps[0].bpm + " bpm" }}
					</div>
					<div 
						v-if="project.flps[0].version" 
						class="border border-yellow-700 bg-yellow-900 rounded px-1 py-0.5 text-sm"
					>
						{{ "v" + project.flps[0].version }}
					</div>
				</div>
			</div>
			<button 
				class="bg-purple-600 w-8 h-8 rounded-full play-button" 
				@click="emit('play', project.last?.url, project.name, project.last?.name)"
				v-if="project.last"
			>
				<font-awesome :icon="faPlay" />
			</button>
		</div>

		<ul>
			<li 
				v-for="m in project.mp3s" 
				:key="m.name" 
				class="flex justify-between"
			>
				<span class="font-mono text-sm">{{ m.name }}</span>
				<button 
					class="w-8 h-8 rounded-full play-button" 
					@click="emit('play', m.url, project.name, m.name)"
				>
					<font-awesome :icon="faPlay" />
				</button>
			</li>
		</ul>
	</div>
</template>

<script setup>
import { faPause, faPlay, faStop } from '@fortawesome/free-solid-svg-icons'

const props = defineProps({
	project: {
		type: Object,
		required: true
	}
});

const emit = defineEmits(['play']);
</script>

<style lang="scss" scoped>

</style>