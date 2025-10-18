import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (!email) return res.status(400).json({ error: 'email required' });

  const user = { id: email, email };
  const token = jwt.sign(user, process.env.NEXTAUTH_SECRET!, { expiresIn: '2h' });
  res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Path=/; Secure; SameSite=Lax; Max-Age=7200`);
  res.json({ ok: true });
}