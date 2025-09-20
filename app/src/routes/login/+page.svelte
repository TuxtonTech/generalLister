<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore, isLoading, authError, isAuthenticated } from '$lib/store/auth';
  import { browser } from '$app/environment';

  let mode: 'signin' | 'signup' | 'reset' = 'signin';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let displayName = '';
  let successMessage = '';


  $: if ($isAuthenticated) {
      if (browser && document.referrer && !document.referrer.includes('/login')) {
          goto(document.referrer);
      } else {
          goto('/dashboard');
      }
  }

  onMount(() => {
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
        // The onAuthStateChanged listener in auth.ts will handle the redirect
      }
    } else {
      await authStore.signIn(email, password);
    }
  }

  async function handleGoogleAuth() {
    authStore.clearError();
    await authStore.signInWithGoogle();
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

  // document.getElementsByTagName('body')[0].style.margin = '0px';  
</script>
		<svelte:head>
      <title>{mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}</title>
    </svelte:head>
<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <button class="logo"><img src="https://" alt="" >Listify</button>
      <h2>
        {#if mode === 'signin'}
          Welcome Back
        {:else if mode === 'signup'}
          Create Your Account
        {:else}
          Reset Password
        {/if}
      </h2>
      <p class="subtitle">
        {#if mode === 'signin'}
          Sign in to continue to your dashboard
        {:else if mode === 'signup'}
          Get started with your new account
        {:else}
          Enter your email to receive a reset link
        {/if}
      </p>
    </div>

    {#if successMessage}
      <div class="message success">
        {successMessage}
      </div>
    {/if}

    {#if $authError}
      <div class="message error">
        {$authError}
      </div>
    {/if}

    <form class="auth-form" on:submit|preventDefault={mode === 'reset' ? handlePasswordReset : handleEmailAuth}>
      <div class="input-group">
        <div class="input-wrapper">
          <label for="email">Email address</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            placeholder="you@example.com"
          />
        </div>

        {#if mode === 'signup'}
          <div class="input-wrapper">
            <label for="displayName">Full Name</label>
            <input
              id="displayName"
              type="text"
              bind:value={displayName}
              placeholder="Your Name (Optional)"
            />
          </div>
        {/if}

        {#if mode !== 'reset'}
          <div class="input-wrapper">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              bind:value={password}
              placeholder="••••••••"
            />
          </div>
        {/if}

        {#if mode === 'signup'}
          <div class="input-wrapper">
            <label for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              bind:value={confirmPassword}
              class:error={confirmPassword && password !== confirmPassword}
              placeholder="••••••••"
            />
            {#if confirmPassword && password !== confirmPassword}
              <p class="password-mismatch">Passwords do not match</p>
            {/if}
          </div>
        {/if}
      </div>
      
      {#if mode === 'signin'}
          <div class="extra-options">
              <button type="button" on:click={() => switchMode('reset')} class="mode-link">
                  Forgot password?
              </button>
          </div>
      {/if}


      <button type="submit" disabled={$isLoading} class="submit-button">
        {#if $isLoading}
            <div class="spinner"></div>
        {:else if mode === 'signin'}
          Sign In
        {:else if mode === 'signup'}
          Create Account
        {:else}
          Send Reset Link
        {/if}
      </button>

      {#if mode !== 'reset'}
        <div class="divider">
          <span>OR</span>
        </div>

        <button type="button" on:click={handleGoogleAuth} disabled={$isLoading} class="google-button">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      {/if}

    </form>
    
    <div class="mode-switch">
      {#if mode === 'signin'}
        Don't have an account? <button type="button" on:click={() => switchMode('signup')} class="mode-link">Sign Up</button>
      {:else if mode === 'signup'}
        Already have an account? <button type="button" on:click={() => switchMode('signin')} class="mode-link">Sign In</button>
      {:else}
        <button type="button" on:click={() => switchMode('signin')} class="mode-link">Back to Sign In</button>
      {/if}
    </div>
  </div>
</div>

<style>
  :root {
    --brand-primary: #6366f1;
    --brand-secondary: #818cf8;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --surface-background: #ffffff;
    --page-background: #f3f4f6;
    --border-color: #d1d5db;
    --success-bg: #d1fae5;
    --success-text: #065f46;
    --error-bg: #fee2e2;
    --error-text: #991b1b;
  }



  .auth-container {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
    /* padding: 2rem 1rem; */
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .auth-card {
    background: var(--surface-background);
    color: var(--text-primary);
    border-radius: 1rem;
    padding: 2.5rem;
    width: 100%;
    max-width: 26rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .logo {
      background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
      color: white;
      width: 78px;
      height: 48px;
      padding: 0rem 3.5rem;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      margin-bottom: 1rem;
  }

  .auth-header h2 {
    font-size: 1.75rem;
    font-weight: 700;
  }

  .auth-header .subtitle {
    margin-top: 0.5rem;
    color: var(--text-secondary);
  }

  .message {
    padding: 1rem;
    margin-bottom: 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
  }

  .message.success {
    background: var(--success-bg);
    color: var(--success-text);
  }

  .message.error {
    background: var(--error-bg);
    color: var(--error-text);
  }
  
  .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
  }
  
  .input-group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
  }

  .input-wrapper {
      display: flex;
      flex-direction: column;
  }
  
  .input-wrapper label {
      margin-bottom: 0.5rem;
      font-weight: 500;
      font-size: 0.875rem;
  }

  .input-wrapper input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background-color: var(--page-background);
    transition: all 0.2s ease;
    box-sizing: border-box;
  }
  
  .input-wrapper input:focus {
      outline: none;
      border-color: var(--brand-primary);
      background-color: var(--surface-background);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  .input-wrapper input.error {
      border-color: var(--error-text);
  }
  
  .password-mismatch {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--error-text);
  }
  
  .extra-options {
      display: flex;
      justify-content: flex-end;
      margin-top: -1rem;
  }

  .submit-button, .google-button {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .submit-button {
    background: var(--brand-primary);
    color: white;
  }
  
  .submit-button:hover:not(:disabled) {
      background: var(--brand-secondary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .submit-button:disabled {
      background-color: #a5b4fc;
      cursor: not-allowed;
  }
  
  .google-button {
      background: var(--surface-background);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
  }
  
  .google-button:hover:not(:disabled) {
      background-color: var(--page-background);
  }

  .google-icon {
    width: 1.25rem;
    height: 1.25rem;
  }
  
  .divider {
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 1rem;
  }
  
  .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--border-color);
  }

  .mode-switch {
    margin-top: 1rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .mode-link {
    background: none;
    border: none;
    color: var(--brand-primary);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  
  .mode-link:hover {
      text-decoration: underline;
  }
  
  .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
      to { transform: rotate(360deg); }
  }

</style>