import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: { 
		adapter: adapter({
			out: 'build',
			precompress: false,
			env: {
				host: '0.0.0.0',
				port: 3000
			}
		}),
		env: {
			publicPrefix: 'PUBLIC_'
		}
	}
};

export default config;