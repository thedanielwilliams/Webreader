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
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        // For development we accept any non-empty email. Password is ignored.
        if (!email) return null;
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