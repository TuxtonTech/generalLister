<script>
  import { createEventDispatcher } from 'svelte';
  
  export let account;
    
  const dispatch = createEventDispatcher();
  let showPassword = false;
  
  function togglePassword() {
    showPassword = !showPassword;
  }
  
  function deleteAccount() {
    if (confirm(`Are you sure you want to delete "${account.name}"?`)) {
      dispatch('delete', { accountId: account.id });
    }
  }
  
  function getAccountIcon(type) {
    return type === 'covr' ? 'CP' : 'EB';
  }
  
  function getStatusClass(type, status) {
    if (type === 'ebay') return 'status-connected';
    return 'status-active';
  }
</script>

<div class="account-card">
  <div class="account-info">
    <div class="account-icon {account.type === 'covr' ? 'covr-icon' : 'ebay-icon'}">
      {getAccountIcon(account.type)}
    </div>
    
    <div class="account-details">
      <h3>{account.name}</h3>
      
      {#if account.type === 'covr'}
        <div class="credential-row">
          <span class="label">Username:</span>
          <span class="value">{account.username}</span>
        </div>
        <div class="credential-row">
          <span class="label">Password:</span>
          <span class="value">
            {#if showPassword}
              {account.password || '••••••••'}
            {:else}
              ••••••••
            {/if}
          </span>
          <button class="password-toggle" on:click={togglePassword}>
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      {:else if account.type === 'ebay'}
        <div class="credential-row">
          <span class="label">Status:</span>
          <span class="value">OAuth Connected</span>
        </div>
      {/if}
      
      <div class="meta-info">
        <span class="created-date">Created: {account.createdAt}</span>
        <span class="status-badge {getStatusClass(account.type, account.status)}">
          {account.type === 'covr' ? 'Active' : 'Connected'}
        </span>
      </div>
    </div>
  </div>
  
  <div class="account-actions">
    <button class="btn btn-danger" on:click={deleteAccount}>
      🗑️ Delete
    </button>
  </div>
</div>

<style>
  .account-card {
    background: rgba(30, 41, 59, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: all 0.3s ease;
    position: relative;
    /* overflow: hidden; */
    height: fit-content;
    margin-bottom: .5rem;
  }

  @media (max-width: 600px) {
    .account-card {
      /* flex-direction: column; */
      /* gap: 1rem; */
          width: fit-content;
    }
  }
  
  .account-card::before {
    width: 100%;
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
  }

  .account-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .account-info {
    display: flex;
    gap: 20px;
    flex: 1;
  }

  .account-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .covr-icon {
    background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  }

  .ebay-icon {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
  }

  .account-details {
    flex: 1;
  }

  .account-details h3 {
    margin: 0 0 16px 0;
    font-size: 20px;
    font-weight: 700;
    color: white;
  }

  .credential-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    gap: 12px;
  }

  .label {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    min-width: 80px;
    font-size: 14px;
  }

  .value {
    color: rgba(255, 255, 255, 0.9);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .password-toggle {
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

  .meta-info {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .created-date {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-active {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  }

  .status-connected {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .account-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn {
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 12px;
    transition: all 0.3s ease;
    white-space: nowrap;
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

  .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
  }
</style>