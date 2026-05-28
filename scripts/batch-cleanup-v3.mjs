import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'ola-assets';
const CHAR_PREFIX = 'characters/xuejie-ola';
const ANIM_PREFIX = 'animations';
const ASSETS_DIR = path.resolve('ola_assets');

const FILE_MAP = {
  'B-01_跳舞': 'b-01-dancing',
  'B-02_自信站姿': 'b-02-confident-pose',
  'B-03_睡觉': 'b-03-sleeping',
  'B-04_健身': 'b-04-workout',
  'B-05_讲课': 'b-05-teaching',
  'B-06_打人': 'b-06-punching',
  'B-07_夜店': 'b-07-nightclub',
  'B-08_OL讲课': 'b-08-ol-teaching',
  'B-09_感谢订阅飞吻': 'b-09-thank-subscribe-kiss',
  'B-10_乞求订阅': 'b-10-beg-subscribe',
  'B-11_户外徒步Lululemon': 'b-11-outdoor-hiking',
  'B-12_约会后走不动路': 'b-12-post-date-bliss',
  'B-13_吃太饱': 'b-13-too-full',
  'C-01_黑丝OL正面': 'c-01-ol-front',
  'C-02_黑丝OL坐姿翘腿': 'c-02-ol-seated-legs-crossed',
  'C-03_黑丝OL回眸': 'c-03-ol-looking-back',
  'C-04_霸总黑风衣': 'c-04-boss-trenchcoat',
  'C-05_靠墙叉手鄙视': 'c-05-wall-lean-disdain',
  'C-06_黑色晚礼服举杯': 'c-06-evening-gown-toast',
  'C-07_考拉卫衣软萌': 'c-07-koala-hoodie-cute',
  'C-08_围裙做饭': 'c-08-apron-cooking',
  'C-09_睡衣趴着刷手机': 'c-09-pajama-phone',
  'C-10_春节旗袍': 'c-10-cny-qipao',
  'C-11_圣诞装': 'c-11-christmas',
  'C-12_毕业季学士服': 'c-12-graduation',
};

const NEW_ASSETS = {
  'c-02-ol-seated-legs-crossed-listen': {
    character_slug: 'xuejie-ola',
    category: 'contrast-outfit',
    name: '黑丝OL坐姿倾听',
    emotion_tag: 'attentive',
    play_mode: 'idle',
  },
  'c-05-wall-lean-disdain-cool': {
    character_slug: 'xuejie-ola',
    category: 'contrast-outfit',
    name: '靠墙叉手鄙视酷版',
    emotion_tag: 'cool-disdain',
    play_mode: 'action',
  },
};

async function uploadBuffer(storagePath, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload ${storagePath}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// ── Task 1: Re-upload cleaned B/C PNGs ──────────────
async function uploadCleanedImages() {
  console.log('\n═══ Task 1: Upload white-bg-removed B/C PNGs ═══\n');
  const folders = ['B系列_动作场景', 'C系列_反差装扮'];
  let count = 0;

  for (const folder of folders) {
    const dir = path.join(ASSETS_DIR, folder);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.png$/i.test(f));

    for (const file of files) {
      const nameNoExt = file.replace(/\.png$/i, '');
      const slug = FILE_MAP[nameNoExt];
      if (!slug) { console.log(`  ⚠️  No slug mapping for ${file}, skipping`); continue; }

      const buffer = fs.readFileSync(path.join(dir, file));
      const storagePath = `${CHAR_PREFIX}/${slug}.png`;
      try {
        await uploadBuffer(storagePath, buffer, 'image/png');
        console.log(`  ✅ ${file} → ${slug}.png (${(buffer.length / 1024).toFixed(0)} KB)`);
        count++;
      } catch (e) {
        console.log(`  ❌ ${file}: ${e.message}`);
      }
    }
  }
  console.log(`\n  Uploaded ${count} cleaned images\n`);
}

// ── Task 3: Upload V3 animations + update DB ─────────
async function uploadV3Animations() {
  console.log('\n═══ Task 3: Upload V3 animations + update DB ═══\n');
  const processedDir = path.join(ASSETS_DIR, 'ola-animations-v3', 'processed');
  const thumbDir = path.join(ASSETS_DIR, 'ola-animations-v3', 'thumbnails');
  const webmFiles = fs.readdirSync(processedDir).filter(f => f.endsWith('.webm')).sort();

  let uploaded = 0;
  let dbUpdated = 0;
  let dbInserted = 0;

  for (const webm of webmFiles) {
    const baseName = webm.replace('.webm', '');
    const mp3 = `${baseName}.mp3`;

    // Upload webm
    const webmBuffer = fs.readFileSync(path.join(processedDir, webm));
    let videoUrl;
    try {
      videoUrl = await uploadBuffer(`${ANIM_PREFIX}/${webm}`, webmBuffer, 'video/webm');
    } catch (e) {
      console.log(`  ❌ ${webm}: ${e.message}`);
      continue;
    }

    // Upload mp3
    let audioUrl = null;
    const mp3Path = path.join(processedDir, mp3);
    if (fs.existsSync(mp3Path)) {
      const mp3Buffer = fs.readFileSync(mp3Path);
      try {
        audioUrl = await uploadBuffer(`${ANIM_PREFIX}/${mp3}`, mp3Buffer, 'audio/mpeg');
      } catch (e) {
        console.log(`  ⚠️  ${mp3}: ${e.message}`);
      }
    }

    uploaded++;
    const sizeMB = (webmBuffer.length / (1024 * 1024)).toFixed(1);
    console.log(`  ✅ ${baseName} (webm: ${sizeMB}MB, mp3: ${audioUrl ? 'yes' : 'no'})`);

    // Determine asset_id for DB — the file basename may differ from asset_id
    // c-03-ol-looking-backmp4 → DB asset_id is c-03-ol-looking-back
    let assetId = baseName;
    if (baseName === 'c-03-ol-looking-backmp4') assetId = 'c-03-ol-looking-back';

    // Check if this is a new asset
    const newMeta = NEW_ASSETS[assetId];
    if (newMeta) {
      // Upload thumbnail as image_url
      let imageUrl = null;
      const thumbPath = path.join(thumbDir, `${baseName}.png`);
      if (fs.existsSync(thumbPath)) {
        const thumbBuffer = fs.readFileSync(thumbPath);
        try {
          imageUrl = await uploadBuffer(`${CHAR_PREFIX}/${assetId}.png`, thumbBuffer, 'image/png');
        } catch { /* use null */ }
      }

      const row = {
        asset_id: assetId,
        character_slug: newMeta.character_slug,
        category: newMeta.category,
        name: newMeta.name,
        emotion_tag: newMeta.emotion_tag,
        image_url: imageUrl,
        video_url: videoUrl,
        audio_url: audioUrl,
        media_type: 'animation',
        play_mode: newMeta.play_mode,
        is_active: true,
        sort_order: 100,
      };
      const { error } = await supabase.from('ola_assets').upsert(row, { onConflict: 'asset_id' });
      if (error) console.log(`  ❌ DB insert ${assetId}: ${error.message}`);
      else { dbInserted++; console.log(`  📝 NEW DB row: ${assetId}`); }
    } else {
      // Update existing asset
      const update = {
        video_url: videoUrl,
        media_type: 'animation',
      };
      if (audioUrl) update.audio_url = audioUrl;

      const { error } = await supabase
        .from('ola_assets')
        .update(update)
        .eq('asset_id', assetId);
      if (error) console.log(`  ❌ DB update ${assetId}: ${error.message}`);
      else { dbUpdated++; }
    }
  }

  console.log(`\n  Uploaded: ${uploaded} webm+mp3 pairs`);
  console.log(`  DB updated: ${dbUpdated} existing assets`);
  console.log(`  DB inserted: ${dbInserted} new assets\n`);
}

// ── Main ─────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Ola Assets: Cleanup + V3 Upload             ║');
  console.log('╚══════════════════════════════════════════════╝');

  await uploadCleanedImages();
  await uploadV3Animations();

  console.log('═══ Done ═══');
}

main().catch(console.error);
