import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' as const },
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        if (!email) return null;
        // In production, validate against your user store.
        const user = { id: email, email };
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token?.user) (session as any).user = token.user as any;
      return session;
    },
  },
};

export default NextAuth(authOptions);