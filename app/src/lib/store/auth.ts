import { writable } from 'svelte/store';
import { browser } from '$app/environment';
// Import firestore and Firestore functions
import { firestore } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDoc } from 'firebase/firestore'; // getDoc is for a one-time fetch

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
            const userRef = doc(firestore, 'users', user.uid);

            // Use onSnapshot to get real-time updates for the user document
            onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data() as User;
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
          // You would also save the user to Firestore here
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, user);
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
          // You would also save the user to Firestore here
          const userRef = doc(firestore, 'users', result.user.uid);
          await setDoc(userRef, result.user);
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

        window.addEventListener('message', async (event) => {
            if (event.data === 'google-auth-success') {
              clearInterval(checkClosed);
            
              const savedUser = JSON.parse(window.opener.localStorage.getItem('user') || '{}');
              if (savedUser.uid) {
                  const userRef = doc(firestore, 'users', savedUser.uid);
                  const docSnap = await getDoc(userRef);
                  if (docSnap.exists()) {
                      const userData = docSnap.data() as User;
                      authState.set({
                          user: userData,
                          isLoading: false,
                    error: null,
                    isAuthenticated: true
                });
              } else {
                  console.error('User data not found in Firestore');
                  authState.set({ ...initialState, isLoading: false });
              }
              } else {
                  console.error('Google auth completed but no user ID found');
                  authState.set({ ...initialState, isLoading: false });
              }
              resolve({ success: true });
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
      // This is not implemented with Firestore and remains as is
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