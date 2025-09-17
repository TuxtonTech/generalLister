import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { getDatabase } from 'firebase/database';
import { ref, get, onValue, set as firebaseSet, off } from 'firebase/database';
import { app } from '$lib/firebase'; // Your Firebase config

// Initialize Firebase Realtime Database
const database = getDatabase(app);

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

// Keep track of database listeners for cleanup
let currentUserListener: (() => void) | null = null;

export const authStore = {
  subscribe: authState.subscribe,
  
  init: () => {
    if (!browser) return;
    
    authState.update(state => ({ ...state, isLoading: true }));
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        
        // Clean up any existing listener
        if (currentUserListener) {
          currentUserListener();
          currentUserListener = null;
        }
        
        // Listen to user data changes in Firebase
        const userRef = ref(database, `users/${user.uid}`);
        
        const unsubscribe = onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(userData));
            
            authState.set({
              user: userData,
              isLoading: false,
              error: null,
              isAuthenticated: true
            });
          } else {
            // User data doesn't exist in Firebase, sign out
            localStorage.removeItem('user');
            authState.set({ ...initialState, isLoading: false });
          }
        }, (error) => {
          console.error('Firebase listener error:', error);
          authState.update(state => ({
            ...state,
            isLoading: false,
            error: 'Failed to load user data'
          }));
        });
        
        // Store the cleanup function
        currentUserListener = () => off(userRef, 'value', unsubscribe);
        
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
        authState.set({ ...initialState, isLoading: false });
      }
    } else {
      authState.update(state => ({ ...state, isLoading: false }));
    }
  },

  // Save user to Firebase Realtime Database
  saveUserToFirebase: async (user: User) => {
    if (!browser) return;
    
    try {
      const userRef = ref(database, `users/${user.uid}`);
      await firebaseSet(userRef, {
        ...user,
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving user to Firebase:', error);
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
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
        
        // Save/update user in Firebase
        try {
          await authStore.saveUserToFirebase(user);
        } catch (firebaseError) {
          console.warn('Failed to save user to Firebase:', firebaseError);
          // Continue with login even if Firebase save fails
        }
      }

      authState.set({
        user,
        isLoading: false,
        error: null,
        isAuthenticated: true
      });

      // Set up Firebase listener for this user
      authStore.setupUserListener(user);

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
        
        // Save new user to Firebase
        try {
          const newUser = {
            ...result.user,
            createdAt: new Date().toISOString()
          };
          await authStore.saveUserToFirebase(newUser);
        } catch (firebaseError) {
          console.warn('Failed to save new user to Firebase:', firebaseError);
        }
      }

      authState.set({
        user: result.user,
        isLoading: false,
        error: null,
        isAuthenticated: true
      });

      // Set up Firebase listener for this user
      authStore.setupUserListener(result.user);

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
        let finished = false;
        
        const checkClosed = setInterval(() => {
          if (popup?.closed && !finished) {
            clearInterval(checkClosed);
            finished = true;
            authState.update(state => ({ ...state, isLoading: false, error: 'Authentication cancelled' }));
            resolve({ success: false, error: 'Authentication cancelled' });
          }
        }, 1000);

        window.addEventListener('message', async (event) => {
          if (event.data === 'google-auth-success' && !finished) {
            clearInterval(checkClosed);
            popup?.close();
            finished = true;
            
            try {
              // Wait a moment for the server to process
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Re-initialize to get the updated user data
              authStore.init();
              
              // Wait for auth state to update
              setTimeout(() => {
                resolve({ success: true });
              }, 500);
              
            } catch (error) {
              authState.update(state => ({
                ...state,
                isLoading: false,
                error: 'Failed to complete Google sign in'
              }));
              resolve({ success: false, error: 'Failed to complete Google sign in' });
            }
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
    // Clean up Firebase listener
    if (currentUserListener) {
      currentUserListener();
      currentUserListener = null;
    }
    
    // Call server signout endpoint
    try {
      await fetch('/api/auth/signout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Server signout failed:', error);
    }
    
    if (browser) {
      localStorage.removeItem('user');
    }
    
    authState.set(initialState);
  },

  clearError: () => {
    authState.update(state => ({ ...state, error: null }));
  },

  // Helper method to set up Firebase listener for a user
  setupUserListener: (user: User) => {
    if (!browser) return;
    
    // Clean up existing listener
    if (currentUserListener) {
      currentUserListener();
    }
    
    const userRef = ref(database, `users/${user.uid}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        // Update localStorage and state with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
        authState.update(state => ({
          ...state,
          user: userData
        }));
      }
    }, (error) => {
      console.error('User data listener error:', error);
    });
    
    currentUserListener = () => off(userRef, 'value', unsubscribe);
  },

  // Get user data from Firebase
  getUserFromFirebase: async (uid: string): Promise<User | null> => {
    if (!browser) return null;
    
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Error getting user from Firebase:', error);
      return null;
    }
  },

  // Update user data in Firebase
  updateUserInFirebase: async (uid: string, updates: Partial<User>) => {
    if (!browser) return;
    
    try {
      const userRef = ref(database, `users/${uid}`);
      const currentData = await get(userRef);
      
      if (currentData.exists()) {
        const updatedUser = {
          ...currentData.val(),
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        await firebaseSet(userRef, updatedUser);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error updating user in Firebase:', error);
      throw error;
    }
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

// Cleanup listeners when page unloads
if (browser) {
  window.addEventListener('beforeunload', () => {
    if (currentUserListener) {
      currentUserListener();
    }
  });
}