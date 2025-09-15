// app/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  // Check for authentication cookie
  const userCookie = cookies.get('userCookie');
  
  let user = null;
  if (userCookie) {
    try {
      user = JSON.parse(userCookie);
    } catch (error) {
      console.error('Failed to parse user cookie:', error);
      // Clear invalid cookie
      cookies.delete('userCookie');
    }
  }

  return {
    user
  };
};