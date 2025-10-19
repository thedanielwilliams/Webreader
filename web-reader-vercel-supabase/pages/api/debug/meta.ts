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
    res.status(500).json({
      ok: false,
      message: e?.message || String(e),
      name: e?.name,
      cause: e?.cause ? {
        name: e?.cause?.name,
        code: e?.cause?.code,
        errno: e?.cause?.errno,
        syscall: e?.cause?.syscall,
        hostname: e?.cause?.hostname,
        address: e?.cause?.address,
      } : undefined,
      stack: e?.stack,
      url_info: {
        SUPABASE_URL_value: process.env.SUPABASE_URL || null,
        SUPABASE_URL_length: (process.env.SUPABASE_URL || '').length,
        SUPABASE_URL_trimmed: (process.env.SUPABASE_URL || '').trim(),
      },
    });
  }
}