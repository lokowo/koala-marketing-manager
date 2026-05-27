import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'ola-assets';
const STORAGE_PREFIX = 'animations';
const PROCESSED_DIR = path.resolve('ola_assets/ola-animations/processed');

const PLAY_MODE_MAP = {
  'h-09-bubbly-boba-nobg': 'idle',
  'b-01-dancing':           'loop',
  'b-09-thank-subscribe-kiss': 'action',
  'b-10-beg-subscribe':     'emotion',
  'h-06-goodnight-nobg':    'action',
  'h-02-morning-coffee-nobg': 'action',
  'h-03-encouragement-nobg': 'action',
  'b-03-sleeping':          'idle',
  'b-07-nightclub':         'loop',
  'h-08-nerd-excited-nobg': 'action',
};

// Strip extension + trailing stray dots: "b-01-dancing..webm" → "b-01-dancing"
function toAssetId(filename) {
  return filename
    .replace(/\.(webm|mp3)$/, '')
    .replace(/\.+$/, '');
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some(b => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" exists`);
    return;
  }
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) throw new Error(`Create bucket failed: ${error.message}`);
  console.log(`Created bucket "${BUCKET}" (public)`);
}

async function findMatchingRecord(assetId) {
  // Exact match first
  const { data: exact } = await supabase
    .from('ola_assets')
    .select('asset_id')
    .eq('asset_id', assetId)
    .maybeSingle();
  if (exact) return exact.asset_id;

  // Prefix match: "h-09-bubbly-boba-nobg" → prefix "h-09"
  const prefix = assetId.match(/^[a-z]-\d+/)?.[0];
  if (!prefix) return null;
  const { data: prefixMatch } = await supabase
    .from('ola_assets')
    .select('asset_id')
    .like('asset_id', `${prefix}%`)
    .limit(1)
    .maybeSingle();
  return prefixMatch?.asset_id ?? null;
}

async function main() {
  await ensureBucket();

  const allFiles = fs.readdirSync(PROCESSED_DIR).filter(f => !f.startsWith('.'));
  const webmFiles = allFiles.filter(f => f.endsWith('.webm'));
  const mp3Files  = allFiles.filter(f => f.endsWith('.mp3'));

  console.log(`\nFound ${webmFiles.length} WebM + ${mp3Files.length} MP3 files\n`);

  const results = [];

  for (const webm of webmFiles) {
    const assetId = toAssetId(webm);
    // Find matching mp3 by checking all mp3 files with same asset id
    const mp3File = mp3Files.find(f => toAssetId(f) === assetId);

    console.log(`━━━ ${assetId} ━━━`);

    // Upload WebM
    const webmBuf = fs.readFileSync(path.join(PROCESSED_DIR, webm));
    const webmKey = `${STORAGE_PREFIX}/${assetId}.webm`;
    process.stdout.write(`  WebM (${(webmBuf.length / 1024).toFixed(0)} KB) → ${webmKey} ...`);

    const { error: webmErr } = await supabase.storage
      .from(BUCKET)
      .upload(webmKey, webmBuf, { contentType: 'video/webm', upsert: true });

    if (webmErr) {
      console.log(` FAILED: ${webmErr.message}`);
      results.push({ assetId, dbAction: 'SKIP (upload failed)', playMode: '-' });
      continue;
    }
    const videoUrl = supabase.storage.from(BUCKET).getPublicUrl(webmKey).data.publicUrl;
    console.log(` OK`);

    // Upload MP3
    let audioUrl = null;
    if (mp3File) {
      const mp3Buf = fs.readFileSync(path.join(PROCESSED_DIR, mp3File));
      const mp3Key = `${STORAGE_PREFIX}/${assetId}.mp3`;
      process.stdout.write(`  MP3  (${(mp3Buf.length / 1024).toFixed(0)} KB) → ${mp3Key} ...`);

      const { error: mp3Err } = await supabase.storage
        .from(BUCKET)
        .upload(mp3Key, mp3Buf, { contentType: 'audio/mpeg', upsert: true });

      if (mp3Err) {
        console.log(` FAILED: ${mp3Err.message}`);
      } else {
        audioUrl = supabase.storage.from(BUCKET).getPublicUrl(mp3Key).data.publicUrl;
        console.log(` OK`);
      }
    }

    // DB: find existing record or insert
    const playMode = PLAY_MODE_MAP[assetId] || 'action';
    const fields = {
      video_url: videoUrl,
      audio_url: audioUrl,
      media_type: 'animation',
      play_mode: playMode,
    };

    const matchedId = await findMatchingRecord(assetId);

    let dbAction;
    if (matchedId) {
      const { error } = await supabase
        .from('ola_assets')
        .update(fields)
        .eq('asset_id', matchedId);
      dbAction = error ? `UPDATE FAILED: ${error.message}` : `UPDATED (${matchedId})`;
    } else {
      const { error } = await supabase
        .from('ola_assets')
        .insert({
          asset_id: assetId,
          character_slug: 'xuejie-ola',
          name: assetId,
          is_active: true,
          ...fields,
        });
      dbAction = error ? `INSERT FAILED: ${error.message}` : 'INSERTED';
    }
    console.log(`  DB: ${dbAction}`);

    results.push({
      assetId,
      videoUrl,
      audioUrl: audioUrl ? 'yes' : 'no',
      playMode,
      webmKB: (webmBuf.length / 1024).toFixed(0),
      dbAction,
    });
  }

  // Summary table
  console.log('\n╔══════════════════════════════════╦════════╦═══════╦══════════╦═══════════════════════════╗');
  console.log('║ Asset ID                         ║  WebM  ║ MP3   ║ PlayMode ║ DB Action                 ║');
  console.log('╠══════════════════════════════════╬════════╬═══════╬══════════╬═══════════════════════════╣');
  for (const r of results) {
    console.log(
      `║ ${r.assetId.padEnd(32)} ║ ${(r.webmKB + 'K').padStart(6)} ║ ${(r.audioUrl || '-').padStart(5)} ║ ${r.playMode.padStart(8)} ║ ${(r.dbAction || '-').padEnd(25)} ║`
    );
  }
  console.log('╚══════════════════════════════════╩════════╩═══════╩══════════╩═══════════════════════════╝');
  console.log(`\nDone: ${results.length} animations processed.`);
}

main().catch(console.error);
