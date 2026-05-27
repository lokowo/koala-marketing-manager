import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'ola-assets';
const STORAGE_PREFIX = 'characters/xuejie-ola';
const ASSETS_DIR = path.resolve('ola_assets');

const CATEGORY_MAP = {
  'A系列_基础建模': 'base-model',
  'B系列_动作场景': 'action-scene',
  'C系列_反差装扮': 'contrast-outfit',
  'H系列_半身像_有背景': 'portrait-bg',
  'H系列_半身像_透明背景': 'portrait-transparent',
};

// Maps Chinese filename fragment → { emotion, english slug for storage }
const FILE_MAP = {
  'A-01_三视图': { emotion: 'neutral', slug: 'a-01-three-views' },
  'A-02a_表情参考_基础6种': { emotion: 'expression-basic', slug: 'a-02a-expression-basic' },
  'A-02b_表情参考_进阶6种': { emotion: 'expression-advanced', slug: 'a-02b-expression-advanced' },
  'A-03_色板参考': { emotion: 'reference', slug: 'a-03-color-palette' },
  'B-01_跳舞': { emotion: 'excited', slug: 'b-01-dancing' },
  'B-02_自信站姿': { emotion: 'confident', slug: 'b-02-confident-pose' },
  'B-03_睡觉': { emotion: 'sleepy', slug: 'b-03-sleeping' },
  'B-04_健身': { emotion: 'determined', slug: 'b-04-workout' },
  'B-05_讲课': { emotion: 'enthusiastic', slug: 'b-05-teaching' },
  'B-06_打人': { emotion: 'angry', slug: 'b-06-punching' },
  'B-07_夜店': { emotion: 'charming', slug: 'b-07-nightclub' },
  'B-08_OL讲课': { emotion: 'confident-professional', slug: 'b-08-ol-teaching' },
  'B-09_感谢订阅飞吻': { emotion: 'grateful', slug: 'b-09-thank-subscribe-kiss' },
  'B-10_乞求订阅': { emotion: 'pitiful', slug: 'b-10-beg-subscribe' },
  'B-11_户外徒步Lululemon': { emotion: 'excited', slug: 'b-11-outdoor-hiking' },
  'B-12_约会后走不动路': { emotion: 'blissful', slug: 'b-12-post-date-bliss' },
  'B-13_吃太饱': { emotion: 'stuffed', slug: 'b-13-too-full' },
  'C-01_黑丝OL正面': { emotion: 'alluring-confident', slug: 'c-01-ol-front' },
  'C-02_黑丝OL坐姿翘腿': { emotion: 'charming', slug: 'c-02-ol-seated-legs-crossed' },
  'C-03_黑丝OL回眸': { emotion: 'mysterious', slug: 'c-03-ol-looking-back' },
  'C-04_霸总黑风衣': { emotion: 'boss-mode', slug: 'c-04-boss-trenchcoat' },
  'C-05_靠墙叉手鄙视': { emotion: 'disdain', slug: 'c-05-wall-lean-disdain' },
  'C-06_黑色晚礼服举杯': { emotion: 'enchanting', slug: 'c-06-evening-gown-toast' },
  'C-07_考拉卫衣软萌': { emotion: 'sleepy-adorable', slug: 'c-07-koala-hoodie-cute' },
  'C-08_围裙做饭': { emotion: 'happy-silly', slug: 'c-08-apron-cooking' },
  'C-09_睡衣趴着刷手机': { emotion: 'lazy', slug: 'c-09-pajama-phone' },
  'C-10_春节旗袍': { emotion: 'festive', slug: 'c-10-cny-qipao' },
  'C-11_圣诞装': { emotion: 'festive-joy', slug: 'c-11-christmas' },
  'C-12_毕业季学士服': { emotion: 'pure-joy', slug: 'c-12-graduation' },
  'H-01_深夜倾听_有背景': { emotion: 'warm-intimate', slug: 'h-01-night-listen-bg' },
  'H-02_清晨咖啡_有背景': { emotion: 'cozy', slug: 'h-02-morning-coffee-bg' },
  'H-03_爱心鼓励_有背景': { emotion: 'encouraging', slug: 'h-03-encouragement-bg' },
  'H-04_深夜陪读_有背景': { emotion: 'drowsy', slug: 'h-04-late-study-bg' },
  'H-05_递咖啡_有背景': { emotion: 'caring', slug: 'h-05-serve-coffee-bg' },
  'H-06_睡前晚安_有背景': { emotion: 'sleepy-intimate', slug: 'h-06-goodnight-bg' },
  'H-07_御姐模式_有背景': { emotion: 'queen-mode', slug: 'h-07-queen-mode-bg' },
  'H-08_学霸兴奋_有背景': { emotion: 'excited-nerd', slug: 'h-08-nerd-excited-bg' },
  'H-09_傻白甜奶茶_有背景': { emotion: 'bubbly', slug: 'h-09-bubbly-boba-bg' },
  'H-01_深夜倾听_透明': { emotion: 'warm-intimate', slug: 'h-01-night-listen-nobg' },
  'H-02_清晨咖啡_透明': { emotion: 'cozy', slug: 'h-02-morning-coffee-nobg' },
  'H-03_爱心鼓励_透明': { emotion: 'encouraging', slug: 'h-03-encouragement-nobg' },
  'H-04_深夜陪读_透明': { emotion: 'drowsy', slug: 'h-04-late-study-nobg' },
  'H-05_递咖啡_透明': { emotion: 'caring', slug: 'h-05-serve-coffee-nobg' },
  'H-06_睡前晚安_透明': { emotion: 'sleepy-intimate', slug: 'h-06-goodnight-nobg' },
  'H-07_御姐模式_透明': { emotion: 'queen-mode', slug: 'h-07-queen-mode-nobg' },
  'H-08_学霸兴奋_透明': { emotion: 'excited-nerd', slug: 'h-08-nerd-excited-nobg' },
  'H-09_傻白甜奶茶_透明': { emotion: 'bubbly', slug: 'h-09-bubbly-boba-nobg' },
};

function lookupFile(fileName) {
  const nameNoExt = fileName.replace(/\.[^.]+$/, '');
  const mapped = FILE_MAP[nameNoExt];
  if (mapped) return mapped;
  return { emotion: 'neutral', slug: nameNoExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() };
}

function deriveName(fileName) {
  return fileName.replace(/\.[^.]+$/, '')
    .replace(/^[A-Z]-\d+[a-z]?_/, '')
    .replace(/_(有背景|透明)$/, '');
}

async function main() {
  // 1. Delete old test images (ola-test-*)
  console.log('Deleting old test images...');
  const { data: oldFiles } = await supabase.storage.from(BUCKET).list('', { limit: 100 });
  const toDelete = (oldFiles || []).filter(f => f.name.startsWith('ola-test-'));
  if (toDelete.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(toDelete.map(f => f.name));
    if (error) console.error('Delete error:', error.message);
    else console.log(`Deleted ${toDelete.length} old test images: ${toDelete.map(f => f.name).join(', ')}`);
  } else {
    console.log('No old test images found');
  }

  // 2. Scan all images
  const entries = [];
  const subfolders = Object.keys(CATEGORY_MAP);

  for (const folder of subfolders) {
    const folderPath = path.join(ASSETS_DIR, folder);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter(f =>
      /\.(png|jpg|jpeg|webp)$/i.test(f) && !f.startsWith('.')
    );

    for (const file of files) {
      entries.push({
        localPath: path.join(folderPath, file),
        fileName: file,
        folder,
        category: CATEGORY_MAP[folder],
      });
    }
  }

  console.log(`\nFound ${entries.length} images to upload\n`);

  // 3. Upload and upsert
  const results = [];
  let sortOrder = 0;

  for (const entry of entries) {
    const { emotion: emotionTag, slug } = lookupFile(entry.fileName);
    const ext = entry.fileName.split('.').pop().toLowerCase();
    const storagePath = `${STORAGE_PREFIX}/${slug}.${ext}`;
    const buffer = fs.readFileSync(entry.localPath);
    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';

    process.stdout.write(`Uploading ${entry.fileName} → ${slug}.${ext} (${(buffer.length / 1024).toFixed(0)} KB)...`);

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadErr) {
      console.log(` FAILED: ${uploadErr.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;
    const assetId = slug;
    const name = deriveName(entry.fileName);

    const row = {
      asset_id: assetId,
      character_slug: 'xuejie-ola',
      category: entry.category,
      name,
      image_url: publicUrl,
      emotion_tag: emotionTag,
      is_active: true,
      sort_order: sortOrder++,
    };

    const { error: dbErr } = await supabase
      .from('ola_assets')
      .upsert(row, { onConflict: 'asset_id' });

    if (dbErr) {
      console.log(` uploaded, DB FAILED: ${dbErr.message}`);
    } else {
      console.log(` OK`);
    }

    results.push({ asset_id: assetId, name, category: entry.category, emotion_tag: emotionTag, url: publicUrl });
  }

  // 4. Print summary
  console.log('\n========================================');
  console.log(`Uploaded & inserted: ${results.length} assets`);
  console.log('========================================\n');

  const maxId = Math.max(...results.map(r => r.asset_id.length));
  const maxCat = Math.max(...results.map(r => r.category.length));
  const maxTag = Math.max(...results.map(r => r.emotion_tag.length));

  for (const r of results) {
    console.log(
      `${r.asset_id.padEnd(maxId)}  ${r.category.padEnd(maxCat)}  ${r.emotion_tag.padEnd(maxTag)}  ${r.url}`
    );
  }
}

main().catch(console.error);
