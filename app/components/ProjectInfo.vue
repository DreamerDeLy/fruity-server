<template>
	<div class="flex gap-5">
		<div class="w-48 aspect-square rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
			<img
				v-if="false" 
				src="" 
				alt="cover" 
				class="w-full h-full object-cover"
			>
			<div>
				<!-- <font-awesome :icon="faMusic" class="text-3xl text-gray-500" /> -->
				<lucide-music class="text-3xl text-gray-500" size="32"/>
			</div>
		</div>
		<div>
			<h1>{{ project.name ?? "Song name" }}</h1>
			<p>Artist: {{ project?.flps[0]?.artist ?? "-" }}</p>
			<p>
				Dates: 
				<span v-if="project?.flps?.length > 1">
					{{ project.flps[0].ctime.substring(0, 10) }} - {{ project.flps[project.flps.length - 1].ctime.substring(0, 10) }}
				</span>
				<span v-else>
					{{ project?.flps?.[0]?.ctime?.substring(0, 10) ?? "-" }}
				</span>
			</p>
		</div>
	</div>
</template>

<script setup>
import { faMusic } from '@fortawesome/free-solid-svg-icons'

defineProps({
	project: Object,
})
</script>

<style scoped>

</style>