import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(), // You should enable this
	kit: { 
		adapter: adapter({
			// For adapter-node, this should be 'bodySize', not 'bodySizeLimit'
			bodySize: 50 * 1024 * 1024 // 50MB
		}),
		// Move env config inside kit
		env: {
			publicPrefix: 'PUBLIC_'
		}
	}
};

export default config;
