import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { authStore, isLoading, authError, isAuthenticated } from '$lib/store/auth';

let mode: 'signin' | 'signup' | 'reset' = 'signin';
let email = '';
let password = '';
let confirmPassword = '';
let displayName = '';
let successMessage = '';
let hasRedirected = false;

$: if ($isAuthenticated && !hasRedirected) {
    hasRedirected = true;
    setTimeout(() => {
      goto('/dashboard');
    }, 100);
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
        await new Promise(resolve => setTimeout(resolve, 500));
        goto('/dashboard');
      }
    }
  } else {
    const result = await authStore.signIn(email, password);
    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));
      goto('/dashboard');
    }
  }
}

async function handleGoogleAuth() {
  authStore.clearError();
  try {
    const result = await authStore.signInWithGoogle();
    if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if ($isAuthenticated) {
          goto('/dashboard');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if ($isAuthenticated) {
            goto('/dashboard');
          } else {
            console.error('Google auth completed but user not authenticated');
          }
        }
    }
  } catch (error) {
    console.error('Google auth error:', error);
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
  hasRedirected = false;
}
</script>

<div class="auth-container">
  <div class="auth-wrapper">
    <div class="auth-header">
      <h2>
        {#if mode === 'signin'}
          Sign in to your account
        {:else if mode === 'signup'}
          Create your account
        {:else}
          Reset your password
        {/if}
      </h2>
    </div>

    {#if successMessage}
      <div class="success-message">
        <div>{successMessage}</div>
      </div>
    {/if}

    {#if $authError}
      <div class="error-message">
        <div>{$authError}</div>
      </div>
    {/if}

    <form class="auth-form" on:submit|preventDefault={mode === 'reset' ? handlePasswordReset : handleEmailAuth}>
      <div class="input-group">
        <div class="input-wrapper">
          <label for="email" class="sr-only">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            class="form-input rounded-top"
            placeholder="Email address"
          />
        </div>

        {#if mode !== 'reset'}
          {#if mode === 'signup'}
            <div class="input-wrapper">
              <label for="displayName" class="sr-only">Full Name</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                bind:value={displayName}
                class="form-input"
                placeholder="Full Name (optional)"
              />
            </div>
          {/if}

          <div class="input-wrapper">
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              bind:value={password}
              class="form-input {mode === 'signin' ? 'rounded-bottom' : ''}"
              placeholder="Password"
            />
          </div>

          {#if mode === 'signup'}
            <div class="input-wrapper">
              <label for="confirmPassword" class="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                bind:value={confirmPassword}
                class="form-input rounded-bottom {mode === 'signup' && confirmPassword && password !== confirmPassword ? 'error' : ''}"
                placeholder="Confirm Password"
              />
              {#if mode === 'signup' && confirmPassword && password !== confirmPassword}
                <p class="password-mismatch">Passwords do not match</p>
              {/if}
            </div>
          {/if}
        {/if}
      </div>

      <div>
        <button
          type="submit"
          disabled={$isLoading || (mode === 'signup' && password !== confirmPassword)}
          class="submit-button"
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

      {#if mode !== 'reset'}
        <div class="divider-section">
          <div class="divider">
            <div class="divider-line">
              <div></div>
            </div>
            <div class="divider-text">
              <span>Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            on:click={handleGoogleAuth}
            disabled={$isLoading}
            class="google-button"
          >
            <svg class="google-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="google-text">Google</span>
          </button>
        </div>
      {/if}

      <div class="mode-links">
        {#if mode === 'signin'}
          <div>
            <button
              type="button"
              on:click={() => switchMode('reset')}
              class="mode-link"
            >
              Forgot your password?
            </button>
          </div>
          <div>
            <button
              type="button"
              on:click={() => switchMode('signup')}
              class="mode-link"
            >
              Don't have an account? Sign up
            </button>
          </div>
        {:else if mode === 'signup'}
          <div>
            <button
              type="button"
              on:click={() => switchMode('signin')}
              class="mode-link"
            >
              Already have an account? Sign in
            </button>
          </div>
        {:else}
          <div>
            <button
              type="button"
              on:click={() => switchMode('signin')}
              class="mode-link"
            >
              Back to sign in
            </button>
          </div>
        {/if}
      </div>
    </form>
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f9fafb;
    padding: 3rem 1rem;
  }

  @media (min-width: 640px) {
    .auth-container {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .auth-container {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  .auth-wrapper {
    max-width: 28rem;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .auth-header h2 {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 1.875rem;
    font-weight: 800;
    color: #111827;
  }

  .success-message {
    border-radius: 0.375rem;
    background-color: #f0fdf4;
    padding: 1rem;
  }

  .success-message div {
    font-size: 0.875rem;
    color: #166534;
  }

  .error-message {
    border-radius: 0.375rem;
    background-color: #fef2f2;
    padding: 1rem;
  }

  .error-message div {
    font-size: 0.875rem;
    color: #991b1b;
  }

  .auth-form {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .input-group {
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: -1px;
  }

  .input-wrapper {
    position: relative;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .form-input {
    position: relative;
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    color: #111827;
    font-size: 0.875rem;
    background-color: white;
  }

  .form-input::placeholder {
    color: #6b7280;
  }

  .form-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 1px #6366f1;
    z-index: 10;
  }

  .form-input.rounded-top {
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
  }

  .form-input.rounded-bottom {
    border-bottom-left-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }

  .form-input.error {
    border-color: #fca5a5;
  }

  .password-mismatch {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #dc2626;
  }

  .submit-button {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.375rem;
    color: white;
    background-color: #4f46e5;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .submit-button:hover:not(:disabled) {
    background-color: #4338ca;
  }

  .submit-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px #4f46e5, 0 0 0 4px rgba(79, 70, 229, 0.1);
  }

  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .divider-section {
    margin-top: 1.5rem;
  }

  .divider {
    position: relative;
  }

  .divider-line {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
  }

  .divider-line div {
    width: 100%;
    border-top: 1px solid #d1d5db;
  }

  .divider-text {
    position: relative;
    display: flex;
    justify-content: center;
    font-size: 0.875rem;
  }

  .divider-text span {
    padding: 0 0.5rem;
    background-color: #f9fafb;
    color: #6b7280;
  }

  .google-button {
    margin-top: 1.5rem;
    width: 100%;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    background-color: white;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .google-button:hover:not(:disabled) {
    background-color: #f9fafb;
  }

  .google-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .google-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .google-text {
    margin-left: 0.5rem;
  }

  .mode-links {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mode-link {
    background: none;
    border: none;
    color: #4f46e5;
    font-size: 0.875rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .mode-link:hover {
    color: #6366f1;
  }

  @media (min-width: 640px) {
    .form-input {
      font-size: 0.875rem;
    }
  }
</style>