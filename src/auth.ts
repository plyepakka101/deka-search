import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}

// Deprecated: Kept for backward compatibility; configure admins via ADMIN_EMAILS environment variable
export const DEFAULT_ADMIN_EMAILS: string[] = [];

export function getAdminEmails(): string[] {
  const raw = (process.env.ADMIN_EMAILS || '').trim();
  let list: string[] = [];
  try {
    if (raw.startsWith('[') && raw.endsWith(']')) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.map((v: unknown) => String(v).trim().toLowerCase().replace(/^["']|["']$/g, ''));
      }
    }
  } catch {}
  if (list.length === 0 && raw) {
    list = raw
      .replace(/[\[\]"']/g, '')
      .split(/[,;\n\s]+/)
      .map((v: string) => v.trim().toLowerCase())
      .filter(Boolean);
  }

  return Array.from(new Set(list));
}

export const ADMIN_EMAILS = getAdminEmails();

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminList = getAdminEmails();
  return adminList.includes(email.trim().toLowerCase());
}

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
        token.isAdmin = isAdminEmail(user.email);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
