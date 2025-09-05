import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		port: 443,
		https: {
			key: fs.readFileSync('/etc/letsencrypt/live/tuxtontech.com/privkey.pem', 'utf8'),
			cert: fs.readFileSync('/etc/letsencrypt/live/tuxtontech.com/fullchain.pem', 'utf8')
		}
	},
	build: {
    rollupOptions: {
      external: ["qs", "tough-cookie", "fetch-cookie", "cheerio", 'fetch-cookie/node-fetch'],
    }
  }
});
