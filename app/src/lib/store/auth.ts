// src/lib/store/auth.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '$lib/firebase';

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
  isLoading: true,
  error: null,
  isAuthenticated: false
};

const authState = writable<AuthState>(initialState);

export const authStore = {
  subscribe: authState.subscribe,

  init: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          authState.set({
            user: docSnap.data() as User,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          });
        } else {
          // If the user is authenticated with Firebase but not in Firestore, create a new document
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
          };
          await setDoc(userRef, newUser, { merge: true });
          authState.set({
            user: newUser,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          });
        }
      } else {
        authState.set({ ...initialState, isLoading: false });
      }
    });
  },

  signInWithGoogle: async () => {
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (error: any) {
      authState.update(state => ({ ...state, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  },

  signUp: async (email: string, password: string, displayName?: string) => {
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      return { success: true };
    } catch (error: any) {
      authState.update(state => ({ ...state, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  },

  signIn: async (email: string, password: string) => {
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      authState.update(state => ({ ...state, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  },

  signOut: async () => {
    await signOut(auth);
  },

  resetPassword: async (email: string) => {
    authState.update(state => ({ ...state, isLoading: true, error: null }));
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      authState.update(state => ({ ...state, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  },

  clearError: () => {
    authState.update(state => ({ ...state, error: null }));
  }
};

// Initialize the auth store
if (browser) {
  authStore.init();
}

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