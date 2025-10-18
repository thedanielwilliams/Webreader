import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { genAesKey, aesGcmEncrypt, wrapPageKey } from '../lib/crypto.ts';
import { insertPageMeta } from '../lib/db.ts';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

async function main() {
  const [,, filePath, bookId, pageNoStr] = process.argv;
  if (!filePath || !bookId || !pageNoStr) {
    console.log('Usage: npm run encrypt:upload -- <file> <bookId> <pageNo>');
    process.exit(1);
  }
  const pageNo = Number(pageNoStr);
  const data = await fs.readFile(path.resolve(filePath));
  const pageKey = genAesKey();
  const { iv, ct, tag } = aesGcmEncrypt(data, pageKey);

  // upload concatenated blob: iv (12) + tag (16) + ciphertext
  const payload = Buffer.concat([iv, tag, ct]);

  const storagePath = `${bookId}/page-${String(pageNo).padStart(4,'0')}.enc`;
  const { error: upErr } = await supabase.storage.from(process.env.SUPABASE_BUCKET!).upload(storagePath, payload, {
    contentType: 'application/octet-stream',
    upsert: true,
  });
  if (upErr) throw upErr;

  // wrap the page key with server MASTER_KEY
  const { wrapped, wIv, wTag } = wrapPageKey(pageKey);

  await insertPageMeta({
    book_id: bookId,
    page_no: pageNo,
    storage_path: storagePath,
    iv_b64: iv.toString('base64'),
    tag_b64: tag.toString('base64'),
    wrapped_key_b64: wrapped,
    wrap_iv_b64: wIv,
    wrap_tag_b64: wTag,
  });

  console.log('Uploaded:', { storagePath });
}

main().catch(e => { console.error(e); process.exit(1); });