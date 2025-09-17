// app/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
  return {
    user: null, // Return null, as client-side Firebase will handle user state
  };
};