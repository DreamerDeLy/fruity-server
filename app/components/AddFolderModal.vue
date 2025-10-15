<template>
	<Transition name="fade">
		<div v-if="show" class="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 shadow-2xl">
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
						@click="show = false"
					>
						Cancel
					</button>
					<button 
						class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
						@click="emit('add-folder', newFolderName, newFolderPath)"
					>
						Add
					</button>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup>
const show = defineModel({ required: true })
const emit = defineEmits(["add-folder"])

const newFolderName = ref("");
const newFolderPath = ref("");
</script>

<style scoped>
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