import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error as any;
    res.json({ ok: true, buckets });
  } catch (e: any) {
    res.status(500).json({ ok: false, name: e.name, message: e.message, stack: e.stack });
  }
}