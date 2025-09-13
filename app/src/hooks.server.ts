import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/core/providers/google";
import { sequence } from "@sveltejs/kit/hooks";
import { redirect } from "@sveltejs/kit";

const { handle: authHandle, signIn, signOut } = SvelteKitAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  ],
  callbacks: {
    async session({ session, token }) {
      // Add additional user data to session if needed
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Persist additional user data
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      // Optional: Add custom sign-in logic
      // You can save user to database here
      console.log('User signed in:', user);
      return true;
    }
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true
});

// Optional: Add route protection
async function protectedRoutes({ event, resolve }) {
  // Protect dashboard routes
  if (event.url.pathname.startsWith('/dashboard')) {
    const session = await event.locals.getSession();
    if (!session) {
      throw redirect(302, '/auth/signin');
    }
  }
  
  return resolve(event);
}

export const handle = sequence(authHandle, protectedRoutes);