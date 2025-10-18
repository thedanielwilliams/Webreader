import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/viewer/doorhinge/1',
      redirect: true,
    });
    if (res?.error) setError(res.error);
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', padding: 24 }}>
      <h1>Sign In</h1>
      <p style={{ color: '#666' }}>Use any email to sign in (dev mode).</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </main>
  );
}