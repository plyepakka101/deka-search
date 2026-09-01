
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// List of emails that have admin rights
export const ADMIN_EMAILS = ['pramot.thamwi@gmail.com', 'plyepakka@gmail.com'];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isAdmin = ADMIN_EMAILS.includes(user.email || '');
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    },
  },
});

