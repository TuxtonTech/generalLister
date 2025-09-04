// accounts.js - Svelte store for managing accounts
import { writable } from 'svelte/store';

// Initial accounts data
const initialAccounts = [
  {
    id: '1',
    name: 'Main COVR Account',
    type: 'covr',
    username: 'john.doe@email.com',
    password: 'encrypted_password_here', // In real app, this should be encrypted
    createdAt: '2024-01-15',
    status: 'active'
  },
  {
    id: '2',
    name: 'eBay Store',
    type: 'ebay',
    oauthConnected: true,
    oauthToken: 'oauth_token_here', // Store OAuth token
    createdAt: '2024-01-20',
    status: 'connected'
  },
   {
    id: '3',
    name: 'eBay Store',
    type: 'ebay',
    oauthConnected: true,
    oauthToken: 'oauth_token_here', // Store OAuth token
    createdAt: '2024-01-20',
    status: 'connected'
  },
   {
    id: '4',
    name: 'eBay Store',
    type: 'ebay',
    oauthConnected: true,
    oauthToken: 'oauth_token_here', // Store OAuth token
    createdAt: '2024-01-20',
    status: 'connected'
  },
   {
    id: '5',
    name: 'eBay Store',
    type: 'ebay',
    oauthConnected: true,
    oauthToken: 'oauth_token_here', // Store OAuth token
    createdAt: '2024-01-20',
    status: 'connected'
  }
];

// Create the writable store
export const accounts = writable(initialAccounts);

// Store methods
export const accountsStore = {
  // Subscribe to the store
  subscribe: accounts.subscribe,
  
  // Add a new account
  add: (accountData) => {
    const newAccount = {
      ...accountData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
      status: accountData.type === 'ebay' ? 'connected' : 'active'
    };
    
    accounts.update(currentAccounts => [...currentAccounts, newAccount]);
    return newAccount;
  },
  
  // Delete an account
  delete: (accountId) => {
    accounts.update(currentAccounts => 
      currentAccounts.filter(account => account.id !== accountId)
    );
  },
  
  // Update an account
  update: (accountId, updates) => {
    accounts.update(currentAccounts =>
      currentAccounts.map(account =>
        account.id === accountId ? { ...account, ...updates } : account
      )
    );
  },
  
  // Get account by ID
  getById: (accountId) => {
    let targetAccount = null;
    accounts.subscribe(currentAccounts => {
      targetAccount = currentAccounts.find(account => account.id === accountId);
    })();
    return targetAccount;
  },
  
  // Get accounts by type
  getByType: (type) => {
    let filteredAccounts = [];
    accounts.subscribe(currentAccounts => {
      filteredAccounts = currentAccounts.filter(account => account.type === type);
    })();
    return filteredAccounts;
  },
  
  // Clear all accounts
  clear: () => {
    accounts.set([]);
  },
  
  // Reset to initial state
  reset: () => {
    accounts.set(initialAccounts);
  }
};