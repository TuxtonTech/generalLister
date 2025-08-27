<script lang="ts">
	import type { PageData } from "./$types";
    export let data: PageData
</script>

<h1>Welcome to SvelteKit</h1>
<p>{data.title}</p>
<p>{data.searchTerm}</p>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
