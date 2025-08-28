import { writable } from "svelte/store";

export const imageUrls = writable<(string | null )[]>([])