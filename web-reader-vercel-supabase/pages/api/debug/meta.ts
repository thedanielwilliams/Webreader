import type { NextApiRequest, NextApiResponse } from 'next';
import { getPageMeta } from '../../../lib/db';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const meta = await getPageMeta('doorhinge', 1);
    res.json({ ok: true, meta });
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e.message });
  }
}