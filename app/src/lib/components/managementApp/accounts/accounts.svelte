<script>
	import { selectedPage } from '$lib/store/app/helpers/selectedPage.js';
  import { accountsStore } from '../../../store/app/accounts/accounts.js';
	import AccountCard from './accountCard/accountCard.svelte';
	import AddAccountForm from './addAccountForm/addAccountForm.svelte';
  let showCreateForm = false;
  
  function toggleCreateForm() {
    // showCreateForm = !showCreateForm;
    selectedPage.set('addAccount');
  }
  
  function handleAccountDeleted(event) {
    accountsStore.delete(event.detail.accountId);
  }
  
  function handleAccountAdded() {
    showCreateForm = false;
  }
</script>

<div class="accounts-container">
  <div class="header">
    <h1>My Accounts</h1>
    <button class="btn btn-primary" on:click={toggleCreateForm}>
      {showCreateForm ? 'Cancel' : '+ Add Account'}
    </button>
  </div>

  <!-- {#if showCreateForm}
    <AddAccountForm on:accountAdded={handleAccountAdded} on:cancel={toggleCreateForm} />
  {/if} -->

  <div class="accounts-grid">
    {#each $accountsStore as account (account.id)}
      <AccountCard {account} on:delete={handleAccountDeleted} />
    {:else}
      <div class="empty-state">
        <p>No accounts configured yet.</p>
        <p>Add your first account to get started!</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .accounts-grid {
  overflow-y: scroll;

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #444 #1a1a1a; /* thumb | track */
}

/* Chrome, Edge, Safari */
.accounts-grid::-webkit-scrollbar {
  width: 10px; /* scrollbar width */
  border-radius: 1rem;
}

.accounts-grid::-webkit-scrollbar-track {
  background: #1a1a1a; /* track background */

}

.accounts-grid::-webkit-scrollbar-thumb {
  background: #444; /* scrollbar thumb */
  border-radius: 10px;
  border: 2px solid #1a1a1a; /* creates padding effect */
}

.accounts-grid::-webkit-scrollbar-thumb:hover {
  background: #6d6b6b; /* hover color */
}

  .accounts-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
    background: rgba(56, 62, 94, 0.744);
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr;
    width: 100%;
    /* overflow-y: hidden; */
  }

  .accounts-grid {
    height: calc(100% - 0px) ;
    overflow: scroll;
    width: 100%;
    /* display: inline; */
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #2e6ae1;
  }

  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #aaaeb4;
    margin: 0;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .accounts-grid {
    /* display: grid; */
    gap: 16px;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
    /* border: 2px dashed #d1d5db; */
    border-radius: 8px;
  }

  .empty-state p {
    margin: 8px 0;
  }
</style>