import { env } from '$env/dynamic/private';

export async function load() {
    console.log('Environment variables loaded:', Object.keys(env));
    return {};
}