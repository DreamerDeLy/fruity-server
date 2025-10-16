import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	css: ['@/assets/css/main.css'],

	vite: {
		plugins: [
			tailwindcss(),
		],
	},

	modules: ['nuxt-lucide-icons', '@vesp/nuxt-fontawesome'],

	app: {
		head: {
			title: 'FruityServer', // default fallback title
			htmlAttrs: {
				lang: 'en',
			},
			link: [
				{ rel: 'icon', type: 'image/svg', href: '/favicon.ico' },
			],
		},
	},
})