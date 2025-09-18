<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, user, isAuthenticated } from '$lib/store/auth';

  let ebayAuthUrl = '';
  let isEbayConnected = false;
  let ebayUser: any = null;
  let dashboardStats = {
    totalListings: 24,
    activeBids: 7,
    soldItems: 156,
    totalEarnings: 4320.50,
    weeklyGrowth: 12.5
  };
  let recentActivity = [
    { type: 'sale', item: 'Vintage Camera Lens', amount: 245.00, time: '2 hours ago' },
    { type: 'listing', item: 'Smartphone Case Bundle', amount: 0, time: '4 hours ago' },
    { type: 'bid', item: 'Retro Gaming Console', amount: 180.00, time: '6 hours ago' },
    { type: 'sale', item: 'Designer Handbag', amount: 320.00, time: '1 day ago' },
  ];

  // Redirect if not authenticated
  onMount(() => {
    if (!$isAuthenticated && $user === null) {
      goto('/login');
    }
    
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
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'sale': return '💰';
      case 'listing': return '📦';
      case 'bid': return '🔥';
      default: return '📊';
    }
  }
</script>



<div class="dashboard-container">
  <!-- Enhanced Navigation -->
  <nav class="nav-container">
    <div class="nav-wrapper">
      <div class="nav-content">
        <div class="nav-left">
          <div class="brand-container">
            <div class="brand-icon">
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
            </div>
            <h1 class="brand-title">Listify</h1>
          </div>
        </div>
        <div class="nav-right">
          {#if $user}
            <div class="user-info">
              {#if $user.photoURL}
                <img src={$user.photoURL} alt="Profile" class="user-avatar">
              {:else}
                <div class="user-avatar-fallback">
                  {($user.displayName || $user.email || '').charAt(0).toUpperCase()}
                </div>
              {/if}
              <span class="user-name">{$user.displayName || $user.email}</span>
              <button on:click={signOut} class="sign-out-btn">Sign Out</button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <div class="main-content" style="">
    <div class="content-wrapper" style="">
      
      <!-- Welcome Section with Stats -->
      <div class="hero-section">
        <!-- Welcome Card -->
        <div class="welcome-card">
          <div class="welcome-bg-decoration"></div>
          <div class="welcome-bg-decoration-2"></div>
          <div class="welcome-content">
            <h2 class="welcome-title">
              Welcome back{$user?.displayName ? `, ${$user.displayName.split(" ")[0]}` : ''}! 
            </h2>
            <p class="welcome-subtitle">
              Ready to boost your sales? Add some more listings <button style="background: linear-gradient(135deg, rgb(110 197 141), rgb(155, 155, 255)); padding: .5rem 1rem !important; margin-left: .5rem;" on:click={() => goto('/app')}>Get it gone</button>
            </p>
            <div class="growth-indicator">
              <div class="growth-card">
                <span class="growth-label">Growth this week</span>
                <div class="growth-value">+{dashboardStats.weeklyGrowth}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="stats-section">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-info">
                <p class="stat-label">Total Revenue</p>
                <p class="stat-value earnings">${dashboardStats.totalEarnings.toLocaleString()}</p>
              </div>
              <div class="stat-icon earnings-icon">💸</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-info">
                <p class="stat-label">Active Listings</p>
                <p class="stat-value listings">{dashboardStats.totalListings}</p>
              </div>
              <div class="stat-icon listings-icon">📦</div>
            </div>
          </div>
        </div>
      </div>

      <!-- eBay Connection Section -->
      <div class="ebay-section">
        <div class="section-header">
          <h3 class="section-title">Orders</h3>
          <p class="section-subtitle">{
            $user?.accounts?.find(acc => acc.provider == 'ebay') || true ? 'Manage your eBay orders and track sales performance' : 'Connect your eBay account to start listing and managing your items'}
        </p>
        </div>
        
        <div class="ebay-content">
          {#if isEbayConnected && ebayUser}
            <div class="connection-success">
              <div class="connection-info">
                <div class="success-icon">
                  <svg width="32" height="32" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="connection-details">
                  <p class="connection-status">Successfully Connected! ✨</p>
                  <p class="connection-account">Account: <span class="account-name">{ebayUser.name || ebayUser.userId}</span></p>
                  <div class="active-indicator">
                    <div class="status-dot"></div>
                    <span class="status-text">Active Connection</span>
                  </div>
                </div>
              </div>
              <button on:click={disconnectEbay} class="disconnect-btn">
                Disconnect
              </button>
            </div>
          {:else}
            <div class="connection-prompt">
              <div class="connect-icon">
                <svg width="40" height="40" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </div>
              <h4 class="connect-title">Connect to eBay</h4>
              <p class="connect-description">
                Link your eBay account to start creating listings, managing inventory, and tracking your sales performance.
              </p>
              <button
                on:click={connectEbay}
                disabled={!ebayAuthUrl}
                class="connect-btn"
              >
                <span>Connect eBay Account</span>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        
        <!-- Quick Actions -->
        <div class="actions-section">
          <div class="actions-card">
            <h3 class="actions-title">Quick Actions</h3>
            <div class="actions-grid">
              
              <button
                disabled={!isEbayConnected}
                class="action-btn create-listing"
              >
                <div class="action-content">
                  <div class="action-icon create-icon">✨</div>
                  <h4 class="action-title">Create New Listing</h4>
                  <p class="action-description">List a new item on eBay with our smart tools</p>
                </div>
              </button>
              
              <button
                disabled={!isEbayConnected}
                class="action-btn manage-listings"
              >
                <div class="action-content">
                  <div class="action-icon manage-icon">📊</div>
                  <h4 class="action-title">Manage Listings</h4>
                  <p class="action-description">View, edit, and optimize your active listings</p>
                </div>
              </button>
              
              <button
                disabled={!isEbayConnected}
                class="action-btn analytics"
              >
                <div class="action-content">
                  <div class="action-icon analytics-icon">📈</div>
                  <h4 class="action-title">Analytics</h4>
                  <p class="action-description">Track performance and sales insights</p>
                </div>
              </button>
              
              <button
                disabled={!isEbayConnected}
                class="action-btn hot-trends"
              >
                <div class="action-content">
                  <div class="action-icon trends-icon">🔥</div>
                  <h4 class="action-title">Hot Trends</h4>
                  <p class="action-description">Discover trending items and opportunities</p>
                </div>
              </button>
              
            </div>
          </div>
        </div>

        <!-- Activity Feed -->
        <div class="sidebar-section">
          <!-- Mini Stats -->
          <div class="mini-stats">
            <div class="mini-stat-card">
              <div class="mini-stat-value bids">{dashboardStats.activeBids}</div>
              <div class="mini-stat-label">Active Bids</div>
            </div>
            <div class="mini-stat-card">
              <div class="mini-stat-value sold">{dashboardStats.soldItems}</div>
              <div class="mini-stat-label">Items Sold</div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="activity-card">
            <div class="activity-header">
              <h3 class="activity-title">Recent Activity</h3>
            </div>
            <div class="activity-content">
              <div class="activity-list">
                {#each recentActivity as activity}
                  <div class="activity-item">
                    <div class="activity-icon {activity.type}">
                      <span>{getActivityIcon(activity.type)}</span>
                    </div>
                    <div class="activity-info">
                      <p class="activity-name">{activity.item}</p>
                      <p class="activity-time">{activity.time}</p>
                    </div>
                    {#if activity.amount > 0}
                      <div class="activity-amount">
                        <p class="amount-value">${activity.amount.toFixed(2)}</p>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Global Styles */
  .dashboard-container {
    /* min-height: 100vh; */
    height: 100dvh;
    overflow: scroll;
    background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #e8eaf6 100%);
  }

  /* Navigation */
  .nav-container {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .nav-wrapper {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  @media (min-width: 640px) {
    .nav-wrapper {
      padding: 0 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .nav-wrapper {
      padding: 0 2rem;
    }
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    height: 4rem;
  }

  .nav-left {
    display: flex;
    align-items: center;
  }

  .brand-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .brand-icon {
    width: 2.5rem;
    height: 2.5rem;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .brand-title {
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(135deg, #1f2937, #6b7280);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid #dbeafe;
  }

  .user-avatar-fallback {
    width: 2rem;
    height: 2rem;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .user-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .sign-out-btn {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .sign-out-btn:hover {
    color: #ef4444;
  }

  /* Main Content */
  .main-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  @media (min-width: 640px) {
    .main-content {
      padding: 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .main-content {
      padding: 2rem;
    }
  }

  .content-wrapper {
    padding: 1.5rem 1rem;
  }

  @media (min-width: 640px) {
    .content-wrapper {
      padding: 1.5rem 0;
    }
  }

  .main-content, .content-wrapper {

    height: 100dvh;
  }

  /* Hero Section */
  .hero-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  @media (min-width: 1024px) {
    .hero-section {
      grid-template-columns: 2fr 1fr;
    }
  }

  .welcome-card {
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
    border-radius: 1rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    color: white;
    padding: 2rem;
    position: relative;
    overflow: hidden;
  }

  .welcome-bg-decoration {
    position: absolute;
    top: 0;
    right: 0;
    width: 8rem;
    height: 8rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(4rem, -4rem);
  }

  .welcome-bg-decoration-2 {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 6rem;
    height: 6rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    transform: translate(-2rem, 2rem);
  }

  .welcome-content {
    position: relative;
    z-index: 1;
  }

  .welcome-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .welcome-subtitle {
    color: rgba(191, 219, 254, 1);
    margin-bottom: 1.5rem;
  }

  .growth-indicator {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .growth-card {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .growth-label {
    font-size: 0.875rem;
    font-weight: 500;
    display: block;
  }

  .growth-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  /* Stats Section */
  .stats-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .stat-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    border: 1px solid rgba(229, 231, 235, 1);
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }

  .stat-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    margin: 0;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .stat-value.earnings {
    color: #10b981;
  }

  .stat-value.listings {
    color: #3b82f6;
  }

  .stat-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .earnings-icon {
    background: #d1fae5;
    color: #065f46;
  }

  .listings-icon {
    background: #dbeafe;
    color: #1e40af;
  }

  /* eBay Section */
  .ebay-section {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
    overflow: hidden;
    border: 1px solid rgba(229, 231, 235, 1);
  }

  .section-header {
    padding: 2rem;
    background: linear-gradient(135deg, #f9fafb 0%, #e0f2fe 100%);
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .section-subtitle {
    color: #6b7280;
    margin: 0;
  }

  .ebay-content {
    padding: 2rem;
  }

  /* Connected State */
  .connection-success {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .connection-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .success-icon {
    width: 4rem;
    height: 4rem;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
  }

  .connection-details {
    display: flex;
    flex-direction: column;
  }

  .connection-status {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .connection-account {
    color: #6b7280;
    margin: 0 0 0.5rem 0;
  }

  .account-name {
    font-weight: 500;
  }

  .active-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 0.5rem;
    height: 0.5rem;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .status-text {
    font-size: 0.875rem;
    color: #10b981;
    font-weight: 500;
  }

  .disconnect-btn {
    padding: 0.75rem 1.5rem;
    border: 2px solid #fecaca;
    background: white;
    color: #dc2626;
    border-radius: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .disconnect-btn:hover {
    background: #fef2f2;
    border-color: #fca5a5;
  }

  /* Not Connected State */
  .connection-prompt {
    text-align: center;
    padding: 2rem 0;
  }

  .connect-icon {
    width: 5rem;
    height: 5rem;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem auto;
    color: white;
    box-shadow: 0 10px 25px rgba(251, 191, 36, 0.3);
  }

  .connect-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .connect-description {
    color: #6b7280;
    margin: 0 0 1.5rem 0;
    max-width: 24rem;
    margin-left: auto;
    margin-right: auto;
  }

  .connect-btn {
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .connect-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(59, 130, 246, 0.4);
  }

  .connect-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Dashboard Grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  @media (min-width: 1024px) {
    .dashboard-grid {
      grid-template-columns: 2fr 1fr;
    }
  }

  /* Actions Section */
  .actions-section {
    display: flex;
    flex-direction: column;
  }

  .actions-card {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    border: 1px solid rgba(229, 231, 235, 1);
  }

  .actions-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 1.5rem 0;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .actions-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* Action Buttons */
  .action-btn {
    padding: 1.5rem;
    border: 2px dashed #d1d5db;
    background: white;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
  }

  .action-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn.create-listing:hover:not(:disabled) {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .action-btn.manage-listings:hover:not(:disabled) {
    border-color: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  }

  .action-btn.analytics:hover:not(:disabled) {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
  }

  .action-btn.hot-trends:hover:not(:disabled) {
    border-color: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
  }

  .action-content {
    text-align: center;
  }

  .action-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem auto;
    font-size: 1.5rem;
    transition: transform 0.2s ease;
  }

  .action-btn:hover:not(:disabled) .action-icon {
    transform: scale(1.1);
  }

  .create-icon {
    background: linear-gradient(135deg, #3b82f6, #6366f1);
  }

  .manage-icon {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  .analytics-icon {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  }

  .trends-icon {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }

  .action-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .action-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  /* Sidebar Section */
  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Mini Stats */
  .mini-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .mini-stat-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    border: 1px solid rgba(229, 231, 235, 1);
    text-align: center;
  }

  .mini-stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
  }

  .mini-stat-value.bids {
    color: #6366f1;
  }

  .mini-stat-value.sold {
    color: #10b981;
  }

  .mini-stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  /* Activity Feed */
  .activity-card {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(229, 231, 235, 1);
  }

  .activity-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(229, 231, 235, 1);
  }

  .activity-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  .activity-content {
    padding: 1.5rem;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .activity-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
  }

  .activity-icon.sale {
    background: #d1fae5;
    color: #065f46;
  }

  .activity-icon.listing {
    background: #dbeafe;
    color: #1e40af;
  }

  .activity-icon.bid {
    background: #fed7aa;
    color: #9a3412;
  }

  .activity-info {
    flex: 1;
    min-width: 0;
  }

  .activity-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .activity-time {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0;
  }

  .activity-amount {
    text-align: right;
  }

  .amount-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #10b981;
    margin: 0;
  }

  /* Animations */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Responsive Design */
  @media (max-width: 640px) {
    .hero-section {
      gap: 1rem;
    }
    
    .welcome-card {
      padding: 1.5rem;
    }
    
    .welcome-title {
      font-size: 1.25rem;
    }
    
    .actions-grid {
      grid-template-columns: 1fr;
    }
    
    .mini-stats {
      grid-template-columns: 1fr;
    }
    
    .connection-success {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .connection-info {
      flex-direction: column;
      text-align: center;
    }
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 1rem;
    }
    
    .content-wrapper {
      padding: 1rem 0;
    }
    
    .ebay-content {
      padding: 1.5rem;
    }
    
    .actions-card {
      padding: 1.5rem;
    }
  }

</style>