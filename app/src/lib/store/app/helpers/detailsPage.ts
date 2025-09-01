import { writable } from "svelte/store";

export const imageUrls = writable<(string | null )[]>([])

export const formDataObj = writable<({
    title: string,
    description: string,
    price: number,
    quantity: number,

})>({title: "", description: "", price: 0, quantity: 1})