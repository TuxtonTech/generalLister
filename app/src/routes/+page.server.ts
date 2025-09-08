import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export async function load() {
    console.log('=== ENVIRONMENT TEST ===');
    console.log('Public env:', env);
    console.log('Private env:', privateEnv);
    console.log('Direct process.env.PUBLIC_TEST:', process.env.PUBLIC_TEST);
    console.log('All process.env keys:', Object.keys(process.env).filter(k => k.includes('TEST')));
    
    return {
        publicEnv: env,
        privateEnv: privateEnv
    };
}