import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const url = (process.env.SUPABASE_URL || '');
  res.json({
    node: process.version,
    SUPABASE_URL_value: url, // raw (so you can spot spaces)
    SUPABASE_URL_length: url.length, // should be Forty-something chars
    SUPABASE_URL_trimmed: url.trim(),
    ANON_present: !!process.env.SUPABASE_ANON_KEY,
    SR_present: !!process.env.SUPABASE_SERVICE_ROLE,
    BUCKET: process.env.SUPABASE_BUCKET,
    SIGN_TTL: process.env.SIGN_TTL,
  });
}