import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept and ignore in MVP; in production, bind to session store/redis
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
}