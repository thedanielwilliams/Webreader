import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { supabaseAdmin } from '../../lib/supabase';
import { unwrapPageKey, aesGcmDecrypt } from '../../lib/crypto';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Require auth (must be signed in to view pages)
  const session = await getServerSession(req, res, authOptions as any);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { bookId, page } = req.query as { bookId?: string; page?: string };
  if (!bookId || !page) {
    res.status(400).json({ error: 'Missing bookId or page' });
    return;
  }

  const pageNo = Number(page);
  if (!Number.isFinite(pageNo)) {
    res.status(400).json({ error: 'Invalid page number' });
    return;
  }

  // Lookup page metadata
  const { data: rows, error: selErr } = await supabaseAdmin
    .from('book_pages')
    .select('*')
    .eq('book_id', bookId)
    .eq('page_no', pageNo)
    .limit(1);

  if (selErr) {
    res.status(500).json({ error: selErr.message });
    return;
  }

  const meta = rows?.[0];
  if (!meta) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  // Download encrypted payload from Storage (iv + tag + ciphertext)
  const bucket = process.env.SUPABASE_BUCKET as string;
  const { data: fileData, error: dlErr } = await supabaseAdmin.storage
    .from(bucket)
    .download(meta.storage_path);

  if (dlErr) {
    res.status(500).json({ error: dlErr.message });
    return;
  }

  const payload = Buffer.from(await fileData.arrayBuffer());

  // Parse IV and TAG from metadata (preferred) and ciphertext from payload remainder
  const iv = Buffer.from(meta.iv_b64, 'base64');
  const tag = Buffer.from(meta.tag_b64, 'base64');
  const ct = payload.slice(iv.length + tag.length);

  // Unwrap the per-page key using MASTER_KEY_BASE64 and decrypt
  const pageKey = unwrapPageKey(meta.wrapped_key_b64, meta.wrap_iv_b64, meta.wrap_tag_b64);
  const pngBytes = aesGcmDecrypt(ct, pageKey, iv, tag);

  // Local-dev fallback: if decrypted image looks effectively empty, try serving a local sample
  try {
    const minBytes = Number(process.env.LOCAL_SAMPLE_MIN_BYTES || 1024);
    if (pngBytes.length < minBytes) {
      const cwd = process.cwd();
      const candidates = [
        path.join(cwd, 'samples/pages/ball.jpg'),
        path.join(cwd, 'samples/pages/ball.png'),
        path.join(cwd, 'page2.png'),
      ];
      for (const candidate of candidates) {
        try {
          await fs.access(candidate);
          const sample = await fs.readFile(candidate);
          const ext = path.extname(candidate).toLowerCase();
          const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
            : ext === '.png' ? 'image/png'
            : 'application/octet-stream';
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'private, no-store');
          res.status(200).send(sample);
          return;
        } catch {
          // try next candidate
        }
      }
    }
  } catch {
    // If sample read fails, fall through to original response
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(pngBytes);
}