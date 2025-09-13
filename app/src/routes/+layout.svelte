<script>
  import { page } from '$app/stores';
  import { signIn, signOut } from '@auth/sveltekit/client';

  export let data;
  $: ({ session } = data);
</script>

<nav>
  {#if session}
    <div class="user-info">
      <img src={session.user?.image} alt="Profile" class="profile-pic" />
      <span>Welcome, {session.user?.name}</span>
      <button on:click={() => signOut({ callbackUrl: '/' })}>
        Sign Out
      </button>
    </div>
  {:else}
    <button on:click={() => signIn('google', { callbackUrl: '/dashboard' })}>
      Sign in with Google
    </button>
  {/if}
</nav>

<main>
  <slot />
</main>

<style>
  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .profile-pic {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }
  
  button {
    background: #4285f4;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #357ae8;
  }
</style>