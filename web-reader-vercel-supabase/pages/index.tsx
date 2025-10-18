import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email as string | undefined;
  return (
    <main style={{ padding: 24 }}>
      <h1>Web Reader (Vercel + Supabase)</h1>
      <p>Welcome{userEmail ? `, ${userEmail}` : ''}.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {session ? (
          <>
            <button onClick={() => signOut()}>Sign Out</button>
            <Link href="/viewer/doorhinge/1">Go to Viewer</Link>
          </>
        ) : (
          <>
            <button onClick={() => signIn()}>Sign In</button>
            <Link href="/signin">Custom Sign-In Page</Link>
          </>
        )}
      </div>
    </main>
  );
}