import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { database } from './firebase';
import { ref, get, onValue } from 'firebase/database';

export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  accounts?: any;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false
};

const authState = writable<AuthState>(initialState);

export const authStore = {
  subscribe: authState.subscribe,
  
  init: () => {
    if (browser) {
      authState.update(state => ({ ...state, isLoading: true }));
      
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          const userRef = ref(database, `users/${user.uid}`);
          onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
              authState.set({
                user: userData,
                isLoading: false,
                error: null,
                isAuthenticated: true
              });
            } else {
              localStorage.removeItem('user');
              authState.set({ ...initialState, isLoading: false });
            }
          });
        } catch (error) {
          localStorage.removeItem('user');
          authState.set({ ...initialState, isLoading: false });
        }
      } else {
        authState.update(state => ({ ...state, isLoading: false }));
      }
    }
  },

  signIn: async (email: string, password: string) => {
    // Existing sign-in logic (not Firebase Auth)
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign in failed');
      }

      const user = await response.json();
      
      if (browser) {
        localStorage.setItem('user', JSON.stringify(user));
        // You would also save the user to Firebase here if it's not a pre-existing user
      }

      authState.set({
        user,
        isLoading: false,
        error: null,
        isAuthenticated: true
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  },

  signUp: async (email: string, password: string, displayName?: string) => {
    // Existing sign-up logic (not Firebase Auth)
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign up failed');
      }

      const result = await response.json();
      
      if (result.needsVerification) {
        authState.update(state => ({ ...state, isLoading: false }));
        return { success: true, needsVerification: true };
      }

      if (browser) {
        localStorage.setItem('user', JSON.stringify(result.user));
        // You would also save the user to Firebase here
      }

      authState.set({
        user: result.user,
        isLoading: false,
        error: null,
        isAuthenticated: true
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  },

  signInWithGoogle: async () => {
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    
    try {
      const popup = window.open(
        '/api/oauth/google',
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            authState.update(state => ({ ...state, isLoading: false, error: 'Authentication cancelled' }));
            resolve({ success: false, error: 'Authentication cancelled' });
          }
        }, 1000);

        window.addEventListener('message', (event) => {
          if (event.data === 'google-auth-success') {
            clearInterval(checkClosed);
            // The `+server.ts` file now writes to Firebase.
            // When the popup closes, the `init` function should be re-run
            // or the user state checked to reflect the new data.
            setTimeout(() => {
              authState.init();
              resolve({ success: true });
            }, 500);
          }
        }, { once: true });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign in failed';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  },

  resetPassword: async (email: string) => {
    // This is not implemented with Firebase and remains as is
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }

      authState.update(state => ({ ...state, isLoading: false }));
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  },

  signOut: async () => {
    if (browser) {
      localStorage.removeItem('user');
    }
    authState.set(initialState);
  },

  clearError: () => {
    authState.update(state => ({ ...state, error: null }));
  }
};
// Export individual stores for easier access
export const user = writable<User | null>(null);
export const isLoading = writable(true);
export const authError = writable<string | null>(null);
export const isAuthenticated = writable(false);

// Subscribe to main store and update individual stores
authState.subscribe(state => {
  user.set(state.user);
  isLoading.set(state.isLoading);
  authError.set(state.error);
  isAuthenticated.set(state.isAuthenticated);
});