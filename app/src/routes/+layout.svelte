<script>
  import { authStore } from '$lib/store/auth';
  import { onMount } from 'svelte';
  
  onMount(() => {
    authStore.init();
  });
</script>