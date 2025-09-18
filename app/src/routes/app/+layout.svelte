<script lang="ts">
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading } from '$lib/store/auth';
    let { children } = $props();
  // Declare isAuthorized as reactive state using $state
  let isAuthorized = $state(false);

  // This Svelte 5 effect will protect this entire route group
  $effect(() => {
    if (!$isLoading) {
      if ($isAuthenticated) {
        isAuthorized = true;
      } else {
        goto('/login');
      }
    }
  });
</script>

{#if isAuthorized}
  {@render children()}
{:else}
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #3c4965;">
    </div>
{/if}