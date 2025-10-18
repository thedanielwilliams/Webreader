import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE!;
const bucket = process.env.SUPABASE_BUCKET!;

async function main() {
  if (!url || !key || !bucket) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE, or SUPABASE_BUCKET in environment');
  }
  const supabase = createClient(url, key);

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;
  const exists = (buckets || []).some((b) => b.name === bucket);
  if (exists) {
    console.log('Bucket exists:', bucket);
    return;
  }
  const { error: createErr } = await supabase.storage.createBucket(bucket, { public: false });
  if (createErr) throw createErr;
  console.log('Bucket created:', bucket);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});