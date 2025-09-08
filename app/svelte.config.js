import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	// preprocess: vitePreprocess(),
	kit: { adapter: adapter({
		bodySizeLimit: 50 * 1024 * 1024
	}) }
};

export default config;
