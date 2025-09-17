// app/src/lib/store/auth.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
// Import Firebase services
import { auth, database } from './firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { ref, set } from 'firebase/database';

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

// This function will handle setting user data in the database
async function createOrUpdateUserInDb(user: User) {
    const userRef = ref(database, `users/${user.uid}`);
    await set(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        // Start with an empty accounts array
        accounts: []
    });
}

export const authStore = {
    subscribe: authState.subscribe,

    init: () => {
        // This is the correct way to handle Firebase auth state changes
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const newUser: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    emailVerified: firebaseUser.emailVerified
                };
                await createOrUpdateUserInDb(newUser);

                authState.set({
                    user: newUser,
                    isLoading: false,
                    error: null,
                    isAuthenticated: true
                });
            } else {
                authState.set({ ...initialState, isLoading: false });
            }
        });
    },

    signIn: async (email: string, password: string) => {
        authState.update(state => ({ ...state, isLoading: true, error: null }));

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Firebase automatically updates the auth state via the onAuthStateChanged listener
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create a user entry in your database
            const newUser: User = {
                uid: user.uid,
                email: user.email,
                displayName: displayName || user.email,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };
            await createOrUpdateUserInDb(newUser);

            // Firebase automatically updates the auth state via the onAuthStateChanged listener
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
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // Firebase automatically updates the auth state via the onAuthStateChanged listener
            return { success: true };
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

    signOut: async () => {
        authState.update(state => ({ ...state, isLoading: true }));
        try {
            await auth.signOut();
            // onAuthStateChanged listener will handle state change
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            authState.set(initialState);
        }
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