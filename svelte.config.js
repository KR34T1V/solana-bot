import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			$test: 'src/test',
			$lib: 'src/lib',
			$routes: 'src/routes'
		}
	},
	preprocess: vitePreprocess()
};

export default config;
