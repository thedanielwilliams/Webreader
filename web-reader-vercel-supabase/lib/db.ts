import { supabaseAdmin } from './supabase.ts';

export type PageMeta = {
  book_id: string;
  page_no: number;
  storage_path: string;
  iv_b64: string; // 12 bytes b64
  tag_b64: string; // 16 bytes b64
  wrapped_key_b64: string;
  wrap_iv_b64: string;
  wrap_tag_b64: string;
};

export async function insertPageMeta(meta: PageMeta) {
  const { error } = await supabaseAdmin
    .from('book_pages')
    .upsert(meta, { onConflict: 'book_id,page_no' });
  if (error) throw error;
}