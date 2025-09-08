import { env } from '$env/dynamic/private';

export async function load() {
    console.log('All environment variables:');
    console.log(env);
    console.log('Keys:', Object.keys(env));
    
    return {
        envKeys: Object.keys(env)
    };
}