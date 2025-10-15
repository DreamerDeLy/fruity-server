<template>
	<div 
		class="
			bg-gray-800 
			hover:bg-gray-700
			data-selected:bg-gray-700 
			border border-gray-800
			rounded-lg 
			flex items-center justify-between 
			cursor-pointer 
			transition-colors 
			overflow-hidden
			hover:[&>div:nth-child(2)]:translate-x-1
			data-selected:[&>div:nth-child(2)]:translate-x-1
		"
		:class="{ 'bg-gray-700': selected }"
		:data-selected="selected ? true : null"
	>
		<div class="flex items-center gap-3 p-2 truncate">
			<div class="w-16 h-16 bg-gray-900 rounded shrink-0 flex items-center justify-center overflow-hidden">
				<img 
					v-if="folder.cover" 
					:src="folder.cover" alt="cover"
					class="w-full h-full object-cover"
				>
				<LucideFolder v-else class="text-gray-500"/>
			</div>

			<h3>{{ folder.name }}</h3>
		</div>

		<div class="p-4 h-full shrink-0 flex items-center justify-center transition-transform">
			<LucideChevronRight />
		</div>
	</div>
</template>

<script setup>
defineProps({
	folder: Object,
	selected: Boolean,
})
</script>

<style scoped>

</style>