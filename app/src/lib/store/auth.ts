import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User as FirebaseUser
} from '@firebase/auth';
import { initializeApp } from '@firebase/app';

// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Types
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  provider: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Helper to convert Firebase user to our User type
function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    provider: firebaseUser.providerData[0]?.providerId || 'email'
  };
}

// Create auth store
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  return {
    subscribe,
    
    // Initialize Firebase auth listener
    init() {
      if (!browser) return;
      
    onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
        const user: User = mapFirebaseUser(firebaseUser);
        set({ user, loading: false, error: null });
        } else {
        set({ user: null, loading: false, error: null });
        }
      }
    );
    },

    // Sign in with email and password
    async signIn(email: string, password: string) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
      } catch (error: any) {
        const errorMessage = getErrorMessage(error.code);
        update(state => ({ ...state, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },

    // Sign up with email and password
    async signUp(email: string, password: string, displayName?: string) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
        if (displayName) {
          await updateProfile(user, { displayName });
        }
        
        await sendEmailVerification(user);
        return { success: true, needsVerification: true };
      } catch (error: any) {
        const errorMessage = getErrorMessage(error.code);
        update(state => ({ ...state, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },

    // Sign in with Google
    async signInWithGoogle() {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        return { success: true };
      } catch (error: any) {
        const errorMessage = getErrorMessage(error.code);
        update(state => ({ ...state, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },

    // Sign out
    async signOut() {
      try {
        await signOut(auth);
        goto('/login');
        return { success: true };
      } catch (error: any) {
        update(state => ({ ...state, error: error.message }));
        return { success: false, error: error.message };
      }
    },

    // Reset password
    async resetPassword(email: string) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
      } catch (error: any) {
        const errorMessage = getErrorMessage(error.code);
        return { success: false, error: errorMessage };
      }
    },

    // Send email verification
    async sendVerification() {
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        try {
          await sendEmailVerification(user);
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }
      return { success: false, error: 'No user or already verified' };
    },

    // Clear error
    clearError() {
      update(state => ({ ...state, error: null }));
    },

    // Get current user's ID token
    async getIdToken() {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    }
  };
}

// Error message helper
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'Email already in use.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled.';
    default:
      return 'An error occurred. Please try again.';
  }
}

// Create store instance
export const authStore = createAuthStore();

// Derived stores for convenience
export const user = derived(authStore, $auth => $auth.user);
export const isLoading = derived(authStore, $auth => $auth.loading);
export const authError = derived(authStore, $auth => $auth.error);
export const isAuthenticated = derived(authStore, $auth => !!$auth.user);

// Utility function for authenticated API calls
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await authStore.getIdToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

// Route guard utility
export function requireAuth(redirectTo = '/login') {
  const authState = authStore;
  // This should be used in load functions or page components
  // You'll need to handle the actual redirect logic in your routes
}