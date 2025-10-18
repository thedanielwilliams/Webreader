import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { supabaseAdmin } from '../../lib/supabase';
import { unwrapPageKey, aesGcmDecrypt } from '../../lib/crypto';
import { getPageMeta } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1) Auth: accept NextAuth session OR a demo cookie 'auth-token'
    const session = await getServerSession(req, res, authOptions as any).catch(() => null);
    const hasAuthCookie = !!req.cookies['auth-token'];
    if (!session && !hasAuthCookie) return res.status(401).json({ error: 'no auth cookie or session' });

    const bookId = String(req.query.bookId || '');
    const pageNo = Number(req.query.page || 0);
    if (!bookId || !pageNo) return res.status(400).json({ error: 'missing bookId/page' });

    // 2) Metadata
    const meta = await getPageMeta(bookId, pageNo).catch((e) => {
      throw new Error('db:getPageMeta failed → ' + e.message);
    });
    if (!meta) return res.status(404).json({ error: 'page meta not found' });

    const mode = String(req.query.mode || '').toLowerCase();
    if (mode === 'json') {
      // 3) Signed URL
      const { data, error } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_BUCKET!)
        .createSignedUrl(meta.storage_path, Number(process.env.SIGN_TTL || 60));

      if (error) return res.status(500).json({ error: 'storage:createSignedUrl → ' + error.message });

      // 4) Unwrap key
      let pageKeyBuf: Buffer;
      try {
        pageKeyBuf = unwrapPageKey(meta.wrapped_key_b64, meta.wrap_iv_b64, meta.wrap_tag_b64);
      } catch (e: any) {
        return res.status(500).json({ error: 'unwrapPageKey failed (MASTER_KEY mismatch?)' });
      }

      // 5) Respond JSON
      return res.json({
        url: data!.signedUrl,
        key: pageKeyBuf.toString('base64'),
        iv: meta.iv_b64,
        tag: meta.tag_b64,
        watermark: 'guest • ' + new Date().toISOString().slice(0, 10),
        expiresIn: Number(process.env.SIGN_TTL || 60),
      });
    }

    // Default: stream decrypted PNG
    const bucket = process.env.SUPABASE_BUCKET as string;
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from(bucket)
      .download(meta.storage_path);

    if (dlErr) {
      return res.status(500).json({ error: 'storage:download → ' + dlErr.message });
    }

    const payload = Buffer.from(await fileData!.arrayBuffer());
    const iv = Buffer.from(meta.iv_b64, 'base64');
    const tag = Buffer.from(meta.tag_b64, 'base64');
    const ct = payload.slice(iv.length + tag.length);

    let pngBytes: Buffer;
    try {
      const pageKey = unwrapPageKey(meta.wrapped_key_b64, meta.wrap_iv_b64, meta.wrap_tag_b64);
      pngBytes = aesGcmDecrypt(ct, pageKey, iv, tag);
    } catch (e: any) {
      return res.status(500).json({ error: 'decrypt failed → ' + (e?.message || e) });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(pngBytes);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'server error' });
  }
}