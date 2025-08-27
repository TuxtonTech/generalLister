import { writable } from 'svelte/store';

export type PageType = 'listing' | 'listings' | 'settings' | 'detailsModal' | 'cameraModal';

export const selectedPage = writable<string>('listing'); // Default value

export const isNavbarVisible = writable<boolean>(true);