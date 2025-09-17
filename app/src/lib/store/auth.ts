// app/src/lib/stores/auth.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
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

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    init: () => {
      if (browser) {
        update(state => ({ ...state, isLoading: true }));
        
        // Check for existing session
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const user = JSON.parse(savedUser);
            set({
              user,
              isLoading: false,
              error: null,
              isAuthenticated: true
            });
          } catch (error) {
            localStorage.removeItem('user');
            set({ ...initialState });
          }
        } else {
          update(state => ({ ...state, isLoading: false }));
        }
      }
    },

    signIn: async (email: string, password: string) => {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        // Replace with your actual sign-in logic
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
        }

        set({
          user,
          isLoading: false,
          error: null,
          isAuthenticated: true
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },

    signUp: async (email: string, password: string, displayName?: string) => {
      update(state => ({ ...state, isLoading: true, error: null }));
      
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
          update(state => ({ ...state, isLoading: false }));
          return { success: true, needsVerification: true };
        }

        if (browser) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }

        set({
          user: result.user,
          isLoading: false,
          error: null,
          isAuthenticated: true
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },

    signInWithGoogle: async () => {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        // Open Google OAuth popup
        const popup = window.open(
          '/api/oauth/google',
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        return new Promise((resolve) => {
          let finished = false
            const checkClosed = setInterval(() => {

            if (popup?.closed && !finished)  {
              clearInterval(checkClosed);
              update(state => ({ ...state, isLoading: false, error: 'Authentication cancelled' }));
              resolve({ success: false, error: 'Authentication cancelled' });
            }
          }, 1000);

          window.addEventListener('message', (event) => {
            if (event.data === 'google-auth-success') {
                //   clearInterval(checkClosed);
                // popup?.close();
                finished = true
                console.log('Google sign in successful');
              // Refresh to get the new user data from cookie
              // window.location.reload();
              resolve({ success: true });
            }
          }, { once: true });
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Google sign in failed';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },

    resetPassword: async (email: string) => {
      update(state => ({ ...state, isLoading: true, error: null }));
      
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

        update(state => ({ ...state, isLoading: false }));
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    },

    signOut: async () => {
      update(state => ({ ...state, isLoading: true }));
      
      try {
        await fetch('/api/auth/signout', { method: 'POST' });
      } catch (error) {
        console.error('Sign out error:', error);
      } finally {
        if (browser) {
          localStorage.removeItem('user');
        }
        set(initialState);
      }
    },

    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

export const authStore = createAuthStore();

// Export individual stores for easier access
export const user = writable<User | null>(null);
export const isLoading = writable(false);
export const authError = writable<string | null>(null);
export const isAuthenticated = writable(false);

// Subscribe to main store and update individual stores
authStore.subscribe(state => {
  user.set(state.user);
  isLoading.set(state.isLoading);
  authError.set(state.error);
  isAuthenticated.set(state.isAuthenticated);
});