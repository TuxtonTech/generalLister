// src/lib/store/app/accounts/accounts.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { user as authUser } from '$lib/store/auth';
import { firestore } from '$lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

// Define the Account interface for type safety
export interface Account {
  id: string;
  name: string;
  type: 'covr' | 'ebay';
  username?: string;
  password?: string; // In a real app, never store passwords in plain text.
  createdAt: string;
  status: 'active' | 'connected';
  oauthConnected?: boolean;
  oAuthToken?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
}

// Create a writable store for the accounts
export const accounts = writable<Account[]>([]);

// Subscribe to the authenticated user from your auth store
if (browser) {
  authUser.subscribe(async (user) => {
    if (user && user.uid) {
      // If a user is logged in, fetch their accounts from Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        accounts.set(userData.accounts || []);
      }
    } else {
      // If no user is logged in, clear the accounts
      accounts.set([]);
    }
  });
}

// Store methods for interacting with Firestore
export const accountsStore = {
  subscribe: accounts.subscribe,

  // Add a new account
  add: async (accountData: Omit<Account, 'id' | 'createdAt' | 'status'>) => {
    const user = get(authUser);
    if (!user) return null;

    const newAccount: Account = {
      ...accountData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
      status: accountData.type === 'ebay' ? 'connected' : 'active'
    };

    const userDocRef = doc(firestore, 'users', user.uid);
    await updateDoc(userDocRef, {
      accounts: arrayUnion(newAccount)
    });

    accounts.update(currentAccounts => [...currentAccounts, newAccount]);
    return newAccount;
  },

  // Delete an account by its ID
  delete: async (accountId: string) => {
    const user = get(authUser);
    if (!user) return;

    let accountToDelete: Account | undefined;
    accounts.subscribe(currentAccounts => {
      accountToDelete = currentAccounts.find(acc => acc.id === accountId);
    })();

    if (accountToDelete) {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        accounts: arrayRemove(accountToDelete)
      });
      accounts.update(currentAccounts => currentAccounts.filter(acc => acc.id !== accountId));
    }
  },

  // Update an existing account
  update: async (accountId: string, updates: Partial<Account>) => {
    const user = get(authUser);
    if (!user) return;

    let updatedAccounts: Account[] = [];
    accounts.subscribe(currentAccounts => {
      updatedAccounts = currentAccounts.map(acc =>
        acc.id === accountId ? { ...acc, ...updates } : acc
      );
    })();

    const userDocRef = doc(firestore, 'users', user.uid);
    await updateDoc(userDocRef, {
      accounts: updatedAccounts
    });
    accounts.set(updatedAccounts);
  },
};

// Helper function to get the current value of a store
function get<T>(store: { subscribe: (cb: (value: T) => void) => void }): T {
  let value: T;
  store.subscribe(v => value = v)();
  return value;
}