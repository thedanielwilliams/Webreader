import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { supabaseAdmin } from '../../lib/supabase';
import { genAesKey, aesGcmEncrypt, wrapPageKey } from '../../lib/crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions as any);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { bookId, pageNo, pngBase64 } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!bookId || !pageNo || !pngBase64) {
      res.status(400).json({ error: 'Missing bookId, pageNo or pngBase64' });
      return;
    }
    const pageNoNum = Number(pageNo);
    if (!Number.isFinite(pageNoNum) || pageNoNum < 1) {
      res.status(400).json({ error: 'Invalid pageNo' });
      return;
    }

    // decode base64 (accept data URLs or raw base64)
    const b64 = String(pngBase64).includes(',') ? String(pngBase64).split(',').pop()! : String(pngBase64);
    const data = Buffer.from(b64, 'base64');
    if (data.length < 1024) {
      res.status(400).json({ error: 'PNG too small' });
      return;
    }

    const pageKey = genAesKey();
    const { iv, ct, tag } = aesGcmEncrypt(data, pageKey);
    const payload = Buffer.concat([iv, tag, ct]);

    const bucket = process.env.SUPABASE_BUCKET as string;
    const storagePath = `${bookId}/page-${String(pageNoNum).padStart(4, '0')}.enc`;
    const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(storagePath, payload, {
      contentType: 'application/octet-stream',
      upsert: true,
    });
    if (upErr) throw upErr;

    const { wrapped, wIv, wTag } = wrapPageKey(pageKey);

    const { error: insErr } = await supabaseAdmin.from('book_pages').upsert({
      book_id: bookId,
      page_no: pageNoNum,
      storage_path: storagePath,
      iv_b64: iv.toString('base64'),
      tag_b64: tag.toString('base64'),
      wrapped_key_b64: wrapped,
      wrap_iv_b64: wIv,
      wrap_tag_b64: wTag,
    }, {
      onConflict: 'book_id,page_no',
    });
    if (insErr) throw insErr;

    res.json({ ok: true, storagePath });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'server error' });
  }
}