<!-- app/src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, user, isAuthenticated } from '$lib/stores/auth';

  let ebayAuthUrl = '';
  let isEbayConnected = false;
  let ebayUser: any = null;

  // Redirect if not authenticated
  $: if (!$isAuthenticated && $user === null) {
    goto('/login');
  }

  onMount(() => {
    authStore.init();
    loadEbayAuthUrl();
    checkEbayConnection();
  });

  async function loadEbayAuthUrl() {
    try {
      const response = await fetch('/api/ebay/login');
      const data = await response.json();
      ebayAuthUrl = data.authUrl;
    } catch (error) {
      console.error('Failed to load eBay auth URL:', error);
    }
  }

  function checkEbayConnection() {
    // Check if eBay is connected by looking for stored eBay user data
    const storedEbayUser = localStorage.getItem('ebayUser');
    if (storedEbayUser) {
      try {
        ebayUser = JSON.parse(storedEbayUser);
        isEbayConnected = true;
      } catch (error) {
        console.error('Failed to parse eBay user data:', error);
        localStorage.removeItem('ebayUser');
      }
    }
  }

  function connectEbay() {
    if (ebayAuthUrl) {
      const popup = window.open(
        ebayAuthUrl,
        'ebay-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Check if connection was successful
          checkEbayConnection();
        }
      }, 1000);

      window.addEventListener('message', (event) => {
        if (event.data === 'ebay-auth-success') {
          clearInterval(checkClosed);
          popup?.close();
          checkEbayConnection();
        }
      }, { once: true });
    }
  }

  async function signOut() {
    await authStore.signOut();
    goto('/login');
  }

  function disconnectEbay() {
    localStorage.removeItem('ebayUser');
    isEbayConnected = false;
    ebayUser = null;
    // You might also want to revoke the eBay token on your server
  }
</script>

<svelte:head>
  <title>Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Navigation -->
  <nav class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-semibold">Dashboard</h1>
        </div>
        <div class="flex items-center space-x-4">
          {#if $user}
            <div class="flex items-center space-x-3">
              {#if $user.photoURL}
                <img src={$user.photoURL} alt="Profile" class="w-8 h-8 rounded-full">
              {/if}
              <span class="text-sm text-gray-700">{$user.displayName || $user.email}</span>
              <button
                on:click={signOut}
                class="text-sm text-red-600 hover:text-red-500"
              >
                Sign Out
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-6 sm:px-0">
      
      <!-- Welcome Section -->
      <div class="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div class="px-4 py-5 sm:p-6">
          <h2 class="text-lg leading-6 font-medium text-gray-900 mb-2">
            Welcome back{$user?.displayName ? `, ${$user.displayName}` : ''}!
          </h2>
          <p class="text-sm text-gray-600">
            Manage your eBay listings and account connections from here.
          </p>
        </div>
      </div>

      <!-- eBay Connection Section -->
      <div class="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            eBay Integration
          </h3>
          
          {#if isEbayConnected && ebayUser}
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-900">Connected to eBay</p>
                  <p class="text-sm text-gray-500">Account: {ebayUser.name || ebayUser.userId}</p>
                </div>
              </div>
              <button
                on:click={disconnectEbay}
                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Disconnect
              </button>
            </div>
          {:else}
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-900">Connect your eBay account to start listing items.</p>
                <p class="text-xs text-gray-500">You'll be redirected to eBay to authorize the connection.</p>
              </div>
              <button
                on:click={connectEbay}
                disabled={!ebayAuthUrl}
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect eBay
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              disabled={!isEbayConnected}
              class="relative block w-full p-4 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div class="text-left">
                <h4 class="text-sm font-medium text-gray-900">Create New Listing</h4>
                <p class="text-xs text-gray-500">List a new item on eBay</p>
              </div>
            </button>
            
            <button
              disabled={!isEbayConnected}
              class="relative block w-full p-4 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div class="text-left">
                <h4 class="text-sm font-medium text-gray-900">Manage Listings</h4>
                <p class="text-xs text-gray-500">View and edit your listings</p>
              </div>
            </button>
            
            <button
              disabled={!isEbayConnected}
              class="relative block w-full p-4 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div class="text-left">
                <h4 class="text-sm font-medium text-gray-900">View Analytics</h4>
                <p class="text-xs text-gray-500">Check your sales performance</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>