// accounts.js - Svelte store for managing accounts with localStorage persistence
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Initial accounts data
const initialAccounts = [
  // {
  //   id: '1',
  //   name: 'Main COVR Account',
  //   type: 'covr',
  //   username: 'john.doe@email.com',
  //   password: 'encrypted_password_here', // In real app, this should be encrypted
  //   createdAt: '2024-01-15',
  //   status: 'active'
  // },
  // {
  //   id: '2',
  //   name: 'eBay Store',
  //   type: 'ebay',
  //   oauthConnected: true,
  //   oauthToken: 'oauth_token_here', // Store OAuth token
  //   createdAt: '2024-01-20',
  //   status: 'connected'
  // },
  // {
  //   id: '3',
  //   name: 'eBay Store',
  //   type: 'ebay',
  //   oauthConnected: true,
  //   oauthToken: 'oauth_token_here', // Store OAuth token
  //   createdAt: '2024-01-20',
  //   status: 'connected'
  // },
  // {
  //   id: '4',
  //   name: 'eBay Store',
  //   type: 'ebay',
  //   oauthConnected: true,
  //   oauthToken: 'oauth_token_here', // Store OAuth token
  //   createdAt: '2024-01-20',
  //   status: 'connected'
  // },
  // {
  //   id: '5',
  //   name: 'eBay Store',
  //   type: 'ebay',
  //   oauthConnected: true,
  //   oauthToken: 'oauth_token_here', // Store OAuth token
  //   createdAt: '2024-01-20',
  //   status: 'connected'
  // }
];

// Storage key for localStorage
const STORAGE_KEY = 'accounts_data';

// Function to load accounts from localStorage
function loadAccountsFromStorage() {
  if (!browser) return initialAccounts;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that it's an array
      return Array.isArray(parsed) ? parsed : initialAccounts;
    }
  } catch (error) {
    console.warn('Error loading accounts from localStorage:', error);
  }
  return initialAccounts;
}

// Function to save accounts to localStorage
function saveAccountsToStorage(accounts) {
  if (!browser) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.warn('Error saving accounts to localStorage:', error);
  }
}

// Create the writable store with initial data from localStorage
const storedAccounts = loadAccountsFromStorage();
export const accounts = writable(storedAccounts);

// Subscribe to changes and save to localStorage automatically
if (browser) {
  accounts.subscribe(currentAccounts => {
    saveAccountsToStorage(currentAccounts);
  });
}

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
    
    accounts.update(currentAccounts => {
      const updated = [...currentAccounts, newAccount];
      return updated;
    });
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
  
  // Get account by ID (using get() for synchronous access)
  getById: (accountId) => {
    let targetAccount = null;
    const unsubscribe = accounts.subscribe(currentAccounts => {
      targetAccount = currentAccounts.find(account => account.id === accountId);
    });
    unsubscribe(); // Clean up subscription
    return targetAccount;
  },
  
  // Get accounts by type
  getByType: (type) => {
    let filteredAccounts = [];
    const unsubscribe = accounts.subscribe(currentAccounts => {
      filteredAccounts = currentAccounts.filter(account => account.type === type);
    });
    unsubscribe(); // Clean up subscription
    return filteredAccounts;
  },
  
  // Clear all accounts
  clear: () => {
    accounts.set([]);
  },
  
  // Reset to initial state (but don't clear localStorage - use clearStorage for that)
  reset: () => {
    accounts.set([...initialAccounts]);
  },
  
  // Clear localStorage and reset to initial state
  clearStorage: () => {
    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
    }
    accounts.set([...initialAccounts]);
  },
  
  // Manual save to localStorage (automatic saving is already enabled)
  saveToStorage: () => {
    const unsubscribe = accounts.subscribe(currentAccounts => {
      saveAccountsToStorage(currentAccounts);
    });
    unsubscribe();
  },
  
  // Manual load from localStorage
  loadFromStorage: () => {
    const loaded = loadAccountsFromStorage();
    accounts.set(loaded);
  }
};