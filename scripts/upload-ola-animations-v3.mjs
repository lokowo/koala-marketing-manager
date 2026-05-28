import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'ola-assets';
const STORAGE_PREFIX = 'animations';
const PROCESSED_DIR = path.resolve('ola_assets/ola-animations-v3/processed');

const PLAY_MODE_MAP = {
  'h-01-night-listen-nobg':        'idle',
  'h-04-late-study-nobg':          'idle',
  'h-05-serve-coffee-nobg':        'action',
  'h-07-queen-mode-nobg':          'action',
  'b-02-confident-pose':           'action',
  'b-04-workout':                  'action',
  'b-05-teaching':                 'action',
  'b-06-punching':                 'emotion',
  'b-08-ol-teaching':              'idle',
  'b-11-outdoor-hiking':           'action',
  'b-12-post-date-bliss':          'emotion',
  'b-13-too-full':                 'emotion',
  'c-01-ol-front':                 'action',
  'c-02-ol-seated-legs-crossed':   'idle',
  'c-02-ol-seated-legs-crossed-listen': 'idle',
  'c-03-ol-looking-back':          'action',
  'c-03-ol-looking-backmp4':       'action',
  'c-04-boss-trenchcoat':          'action',
  'c-04-boss-trenchcoat-half':     'idle',
  'c-05-wall-lean-disdain':        'action',
  'c-05-wall-lean-disdain-cool':   'action',
  'c-06-evening-gown-toast':       'action',
  'c-07-koala-hoodie-cute':        'idle',
  'c-08-apron-cooking':            'idle',
  'c-09-pajama-phone':             'idle',
  'c-12-graduation':               'action',
};

function toAssetId(filename) {
  return filename.replace(/\.(webm|mp3)$/, '').replace(/\.+$/, '');
}

async function findMatchingRecord(assetId) {
  const { data: exact } = await supabase
    .from('ola_assets')
    .select('asset_id')
    .eq('asset_id', assetId)
    .maybeSingle();
  if (exact) return exact.asset_id;

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
  const allFiles = fs.readdirSync(PROCESSED_DIR).filter(f => !f.startsWith('.'));
  const webmFiles = allFiles.filter(f => f.endsWith('.webm'));
  const mp3Files  = allFiles.filter(f => f.endsWith('.mp3'));

  console.log(`\nFound ${webmFiles.length} WebM + ${mp3Files.length} MP3 files\n`);

  const results = [];

  for (const webm of webmFiles) {
    const assetId = toAssetId(webm);
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

    // DB update
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

  // Summary
  console.log('\n╔══════════════════════════════════════╦════════╦═══════╦══════════╦═══════════════════════════╗');
  console.log('║ Asset ID                             ║  WebM  ║ MP3   ║ PlayMode ║ DB Action                 ║');
  console.log('╠══════════════════════════════════════╬════════╬═══════╬══════════╬═══════════════════════════╣');
  for (const r of results) {
    console.log(
      `║ ${r.assetId.padEnd(36)} ║ ${(r.webmKB + 'K').padStart(6)} ║ ${(r.audioUrl || '-').padStart(5)} ║ ${r.playMode.padStart(8)} ║ ${(r.dbAction || '-').padEnd(25)} ║`
    );
  }
  console.log('╚══════════════════════════════════════╩════════╩═══════╩══════════╩═══════════════════════════╝');
  console.log(`\nDone: ${results.length} V3 animations processed.`);
}

main().catch(console.error);
