import crypto from 'crypto';

/** Encrypt raw bytes with AES-256-GCM */
export function aesGcmEncrypt(plain: Buffer, key: Buffer, iv?: Buffer) {
  const _iv = iv ?? crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, _iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: _iv, ct, tag };
}

/** Decrypt AES-256-GCM */
export function aesGcmDecrypt(ct: Buffer, key: Buffer, iv: Buffer, tag: Buffer) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt;
}

/** Generate a random 32-byte AES key */
export function genAesKey() {
  return crypto.randomBytes(32);
}

/** Wrap a page key using MASTER_KEY via AES-GCM */
export function wrapPageKey(rawPageKey: Buffer): { wrapped: string, wIv: string, wTag: string } {
  const MASTER = Buffer.from(process.env.MASTER_KEY_BASE64!, 'base64');
  const { iv, ct, tag } = aesGcmEncrypt(rawPageKey, MASTER);
  return { wrapped: ct.toString('base64'), wIv: iv.toString('base64'), wTag: tag.toString('base64') };
}

/** Unwrap page key with MASTER_KEY */
export function unwrapPageKey(wrappedB64: string, wIvB64: string, wTagB64: string): Buffer {
  const MASTER = Buffer.from(process.env.MASTER_KEY_BASE64!, 'base64');
  const ct = Buffer.from(wrappedB64, 'base64');
  const iv = Buffer.from(wIvB64, 'base64');
  const tag = Buffer.from(wTagB64, 'base64');
  return aesGcmDecrypt(ct, MASTER, iv, tag);
}