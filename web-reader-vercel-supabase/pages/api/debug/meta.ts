import type { NextApiRequest, NextApiResponse } from 'next';
import { getPageMeta } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const bookId = String(req.query.bookId || 'doorhinge');
    const pageNo = Number(req.query.page || 1);
    const meta = await getPageMeta(bookId, pageNo);
    if (!meta) return res.status(404).json({ ok: false, message: 'meta not found', bookId, pageNo });
    res.json({ ok: true, meta, bookId, pageNo });
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e.message });
  }
}