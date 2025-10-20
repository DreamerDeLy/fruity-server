<template>
	<div>
		<div class="flex gap-5">
			<div class="w-48 aspect-square rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
				<img
					v-if="false" 
					src="" 
					alt="cover" 
					class="w-full h-full object-cover"
				>
				<div>
					<lucide-music class="text-3xl text-gray-500" size="32"/>
				</div>
			</div>
			<div class="grow-1 flex flex-row gap-2">
				<div class="grow-1">
					<h1>{{ project.name ?? "Song name" }}</h1>
					<p>
						Title: 
						<span v-if="title">
							{{ title }}
						</span>
						<span v-else class="text-gray-500 font-mono">
							[no title]
						</span>
					</p>
					<p>
						Dates: 
						<span v-if="project.flps.length > 1">
							{{ formatDateShort(project.flps[0].ctime) }} - {{ formatDateShort(project.flps[project.flps.length - 1].ctime) }}
						</span>
						<span v-else>
							{{ formatDateShort(project.flps[0].ctime) ?? "-" }}
						</span>
					</p>
					<p>
						FLP Files: {{ project.flps.length }}
					</p>
					<p>
						MP3 Files: {{ project.flps.length }}
					</p>
				</div>
				<div class="flex flex-col gap-2 [&>button]:py-2 items-center">
					<button alt="Favorite">
						<lucide-star size="20"/>
					</button>
					<button alt="Open folder" @click="openFolder">
						<lucide-folder-open size="20"/>
					</button>
					<button alt="Open in FL Studio">
						<lucide-external-link size="20"/>
					</button>
				</div>
			</div>
		</div>

		<br>

		<hr class="border-gray-800">

		<br>

		<div>
			<h4 class="font-semibold mb-2">
				MP3 Files
			</h4>

			<div 
				v-for="mp3 in project.mp3s"
			>
				<div class="flex justify-between items-center mb-2 bg-gray-800 rounded-lg">
					<div class="flex">
						<button class="mr-2 pr-1 pl-3">
							<lucide-chevron-right/>
						</button>
						<div class="p-2 pl-0">
							<span class="font-mono">{{ mp3.name }}</span>
							<span class="text-gray-500">
								&nbsp;•&nbsp;
							</span>
							<span class="text-gray-500">
								{{ (new Date(mp3.ctime)).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) }}
							</span>
						</div>
					</div>
					<button class="bg-purple-600 w-8 h-8 rounded-full play-button" @click="play(mp3)">
						<font-awesome :icon="faPlay" />
					</button>
				</div>
			</div>
		</div>

		<br>

		<div>
			<h4 class="font-semibold mb-2">
				Project notes
			</h4>

			<textarea
				class="w-full h-26 bg-gray-800 rounded-lg p-2 resize-y"
				:value="project.notes" placeholder="Type your notes here..."
			>	
			</textarea>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue';
import { faPlay } from "@fortawesome/free-solid-svg-icons"
import { usePlayer } from '~/composables/usePlayer';

const props = defineProps({
	project: Object,
})

const player = usePlayer();

function play(mp3) {
	if (!mp3?.url) return;
	player.play({ url: mp3.url, projectName: props.project?.name || '', trackName: mp3.name });
}

function formatDateShort(dateStr) {
	return (new Date(dateStr)).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

const title = computed(() => {
	return props.project.flps.find(flp => flp.title != null && flp.title != "\u0000")?.title
})
</script>

<style scoped>

</style>