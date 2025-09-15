<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore, isLoading, authError, isAuthenticated } from '$lib/stores/auth';

  let mode: 'signin' | 'signup' | 'reset' = 'signin';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let displayName = '';
  let successMessage = '';

  // Redirect if already authenticated
  $: if ($isAuthenticated) {
    goto('/dashboard');
  }

  onMount(() => {
    authStore.init();
    authStore.clearError();
  });

  async function handleEmailAuth() {
    authStore.clearError();
    successMessage = '';

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        return;
      }
      
      const result = await authStore.signUp(email, password, displayName);
      if (result.success) {
        if (result.needsVerification) {
          successMessage = 'Account created! Please check your email to verify your account.';
        } else {
          goto('/dashboard');
        }
      }
    } else {
      const result = await authStore.signIn(email, password);
      if (result.success) {
        goto('/dashboard');
      }
    }
  }

  async function handleGoogleAuth() {
    authStore.clearError();
    const result = await authStore.signInWithGoogle();
    if (result.success) {
      goto('/dashboard');
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      return;
    }

    const result = await authStore.resetPassword(email);
    if (result.success) {
      successMessage = 'Password reset email sent! Check your inbox.';
      mode = 'signin';
    }
  }

  function switchMode(newMode: 'signin' | 'signup' | 'reset') {
    mode = newMode;
    password = '';
    confirmPassword = '';
    displayName = '';
    authStore.clearError();
    successMessage = '';
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Header -->
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        {#if mode === 'signin'}
          Sign in to your account
        {:else if mode === 'signup'}
          Create your account
        {:else}
          Reset your password
        {/if}
      </h2>
    </div>

    <!-- Success Message -->
    {#if successMessage}
      <div class="rounded-md bg-green-50 p-4">
        <div class="text-sm text-green-800">{successMessage}</div>
      </div>
    {/if}

    <!-- Error Message -->
    {#if $authError}
      <div class="rounded-md bg-red-50 p-4">
        <div class="text-sm text-red-800">{$authError}</div>
      </div>
    {/if}

    <!-- Email/Password Form -->
    <form class="mt-8 space-y-6" on:submit|preventDefault={mode === 'reset' ? handlePasswordReset : handleEmailAuth}>
      <div class="rounded-md shadow-sm -space-y-px">
        <!-- Email -->
        <div>
          <label for="email" class="sr-only">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Email address"
          />
        </div>

        {#if mode !== 'reset'}
          <!-- Display Name (signup only) -->
          {#if mode === 'signup'}
            <div>
              <label for="displayName" class="sr-only">Full Name</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                bind:value={displayName}
                class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Full Name (optional)"
              />
            </div>
          {/if}

          <!-- Password -->
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              bind:value={password}
              class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 {mode === 'signin' ? 'rounded-b-md' : ''} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            />
          </div>

          <!-- Confirm Password (signup only) -->
          {#if mode === 'signup'}
            <div>
              <label for="confirmPassword" class="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                bind:value={confirmPassword}
                class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                class:border-red-300={mode === 'signup' && confirmPassword && password !== confirmPassword}
                placeholder="Confirm Password"
              />
              {#if mode === 'signup' && confirmPassword && password !== confirmPassword}
                <p class="mt-1 text-sm text-red-600">Passwords do not match</p>
              {/if}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Submit Button -->
      <div>
        <button
          type="submit"
          disabled={$isLoading || (mode === 'signup' && password !== confirmPassword)}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if $isLoading}
            Processing...
          {:else if mode === 'signin'}
            Sign in
          {:else if mode === 'signup'}
            Sign up
          {:else}
            Send reset email
          {/if}
        </button>
      </div>

      <!-- Google Sign In (not for reset mode) -->
      {#if mode !== 'reset'}
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div class="mt-6">
            <button
              type="button"
              on:click={handleGoogleAuth}
              disabled={$isLoading}
              class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span class="ml-2">Google</span>
            </button>
          </div>
        </div>
      {/if}

      <!-- Mode Switching Links -->
      <div class="text-center space-y-2">
        {#if mode === 'signin'}
          <div>
            <button
              type="button"
              on:click={() => switchMode('reset')}
              class="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Forgot your password?
            </button>
          </div>
          <div>
            <button
              type="button"
              on:click={() => switchMode('signup')}
              class="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Don't have an account? Sign up
            </button>
          </div>
        {:else if mode === 'signup'}
          <div>
            <button
              type="button"
              on:click={() => switchMode('signin')}
              class="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Already have an account? Sign in
            </button>
          </div>
        {:else}
          <div>
            <button
              type="button"
              on:click={() => switchMode('signin')}
              class="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Back to sign in
            </button>
          </div>
        {/if}
      </div>
    </form>
  </div>
</div>