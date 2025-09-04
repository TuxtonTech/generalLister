<script>
	import { accountsStore } from '$lib/store/app/accounts/accounts';
	import { selectedPage } from '$lib/store/app/helpers/selectedPage';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

    let formData = {
    name: '',
    type: 'covr',
    username: '',
    password: ''
  };
  
  let showPassword = false;
  let isConnectingEbay = false;
  let errors = {};
  
  function togglePassword() {
    showPassword = !showPassword;
  }
  
  function validateForm() {
    errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Account name is required';
    }
    
    if (formData.type === 'covr') {
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      }
      if (!formData.password.trim()) {
        errors.password = 'Password is required';
      }
    }
    
    return Object.keys(errors).length === 0;
  }
  
  function handleSubmit() {
    if (!validateForm()) return;
    
    const accountData = {
      name: formData.name,
      type: formData.type,
    };
    
    if (formData.type === 'covr') {
      accountData.username = formData.username;
      accountData.password = formData.password; // In real app, hash this
    } else if (formData.type === 'ebay') {
      accountData.oauthConnected = isConnectingEbay;
      // accountData.oauthToken = isConnectingEbay ? 'mock_oauth_token' : null;
    }
    
    accountsStore.add(accountData);
    resetForm();
    dispatch('accountAdded');
    selectedPage.set('accounts')
  }
  
  async function handleEbayConnect() {
    isConnectingEbay = true;
    
    // Simulate OAuth flow
    try {
      const response = await fetch('/api/ebay/login');
      if (!response.ok) throw new Error('Failed to initiate eBay OAuth');   
      const { authUrl } = await response.json();
      console.log(authUrl)
      await loadEbayOAuthWindow(authUrl);

      alert('Successfully connected to eBay!\n(This is a simulation)');
    } catch (error) {
      alert('Failed to connect to eBay');
      isConnectingEbay = false;
    }
  }

  async function loadEbayOAuthWindow(authUrl) {
    const popup = window.open(authUrl, '_blank', 'width=600,height=700');
    const interval = setInterval(() => {
        const cookie = document.cookie.split('; ').find(c => c.startsWith('userCookie='));
        if (cookie) {
            clearInterval(interval);
            const userData = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
            accountsStore.add(userData);
            popup?.close();
            return
          }
    }, 500);
    
  }
  
  function resetForm() {
    formData = {
      name: '',
      type: 'covr',
      username: '',
      password: ''
    };
    showPassword = false;
    isConnectingEbay = false;
    errors = {};
  }
  
  function handleCancel() {
    resetForm();
    dispatch('cancel');
    selectedPage.set('accounts');
  }
  
  function handleTypeChange() {
    // Clear type-specific errors when changing account type
    delete errors.username;
    delete errors.password;
    isConnectingEbay = false;
  }
</script>

<div class="form-container">
  <h3>Add New Account</h3>
  
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="name">Account Name *</label>
      <input 
        type="text" 
        id="name" 
        bind:value={formData.name}
        placeholder="Enter a name for this account"
        class:error={errors.name}
      />
      {#if errors.name}
        <span class="error-message">{errors.name}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="type">Account Type *</label>
      <select 
        id="type" 
        bind:value={formData.type}
        on:change={handleTypeChange}
      >
        <option value="covr">COVR Price</option>
        <option value="ebay">eBay</option>
      </select>
    </div>

    {#if formData.type === 'covr'}
      <div class="form-group">
        <label for="username">Username *</label>
        <input 
          type="text" 
          id="username" 
          bind:value={formData.username}
          placeholder="Enter your COVR username"
          class:error={errors.username}
        />
        {#if errors.username}
          <span class="error-message">{errors.username}</span>
        {/if}
      </div>

      <div class="form-group">
        <label for="password">Password *</label>
        <div class="password-input">
          <input 
            type={showPassword ? 'text' : 'password'}
            id="password" 
            bind:value={formData.password}
            placeholder="Enter your COVR password"
            class:error={errors.password}
          />
          <button 
            type="button" 
            class="password-toggle"
            on:click={togglePassword}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {#if errors.password}
          <span class="error-message">{errors.password}</span>
        {/if}
      </div>
      
    {:else if formData.type === 'ebay'}
      <div class="oauth-section">
        <div class="oauth-info">
          <h4>eBay OAuth Integration</h4>
          <p>To connect your eBay account, you'll need to authorize this application through eBay's secure OAuth flow.</p>
          
          {#if !isConnectingEbay}
            <button 
              type="button" 
              class="btn btn-oauth"
              on:click={handleEbayConnect}
            >
              🔗 Connect to eBay
            </button>
          {:else}
            <div class="oauth-success">
              <span class="success-icon">✅</span>
              <span>Successfully connected to eBay!</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" on:click={handleCancel}>
        Cancel
      </button>
      <button 
        type="submit" 
        class="btn btn-primary"
        disabled={formData.type === 'ebay' && !isConnectingEbay}
      >
        Add Account
      </button>
    </div>
  </form>
</div>

<style>
  .form-container {
    background: rgba(30, 41, 59, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 32px;
    /* margin-bottom: 32px; */
    position: relative;
    height: auto;
    /* overflow-y: scroll; */
  }

  .form-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
  }

  .form-container h3 {
    margin: 0 0 24px 0;
    font-size: 22px;
    font-weight: 700;
    color: white;
  }

  .form-group {
    margin-bottom: 24px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
  }

  .form-group input, 
  .form-group select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    font-size: 14px;
    transition: all 0.3s ease;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    backdrop-filter: blur(10px);
  }

  .form-group input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .form-group input:focus, 
  .form-group select:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
    background: rgba(255, 255, 255, 0.15);
  }

  .form-group input.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
  }

  .password-input {
    position: relative;
  }

  .password-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.2s;
    color: rgba(255, 255, 255, 0.7);
  }

  .password-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .error-message {
    display: block;
    margin-top: 6px;
    color: #fca5a5;
    font-size: 12px;
    font-weight: 500;
  }

  .oauth-section {
    margin: 24px 0;
  }

  .oauth-info {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    padding: 24px;
    backdrop-filter: blur(10px);
  }

  .oauth-info h4 {
    margin: 0 0 12px 0;
    color: #93c5fd;
    font-size: 18px;
    font-weight: 700;
  }

  .oauth-info p {
    margin: 0 0 20px 0;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    line-height: 1.6;
  }

  .oauth-success {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #86efac;
    font-weight: 600;
    padding: 12px 16px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .success-icon {
    font-size: 18px;
  }

  .form-actions {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn {
    padding: 12px 24px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .btn:hover::before {
    left: 100%;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn:disabled:hover {
    transform: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    transform: translateY(-2px);
  }

  .btn-oauth {
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    color: white;
    padding: 14px 24px;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(29, 78, 216, 0.3);
  }

  .btn-oauth:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(29, 78, 216, 0.4);
  }
</style>