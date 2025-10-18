import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.json({
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    ANON: !!process.env.SUPABASE_ANON_KEY,
    SR: !!process.env.SUPABASE_SERVICE_ROLE,
    BUCKET: process.env.SUPABASE_BUCKET || '',
    SIGN_TTL: process.env.SIGN_TTL || '',
    NODE: process.version,
  });
}