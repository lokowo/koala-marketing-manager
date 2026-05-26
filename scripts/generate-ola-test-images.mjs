import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHARACTER_BASE = `Semi-realistic anime illustration style like Genshin Impact / Honkai Star Rail character art. Young woman age 24, small oval face with soft jawline, flat straight dark brown eyebrows, slightly upturned almond-shaped eyes with cat-eye lift at outer corner, large amber irises (#C68A3D), natural double eyelids, long lashes, small straight nose, full lips with M-shaped cupid's bow and naturally upturned corners, warm fair skin (#F8CBAF), soft pink blush on cheeks, side-swept air bangs, brown (#845942) medium wavy hair to collarbone. White button-up shirt with small Ola koala mascot embroidered badge on left chest. Thin bracelet with tiny koala charm on left wrist. Clean lineart, soft cel shading, warm color palette.`;

const images = [
  {
    name: 'ola-test-01-ol-stockings',
    prompt: `${CHARACTER_BASE} full body standing pose, hand on hip, wearing black fitted blazer over white dress shirt with top button slightly undone, black pencil skirt above knee, sheer black stockings, black pointed stiletto high heels, alluring confident smile, transparent background, no text no watermark`,
  },
  {
    name: 'ola-test-02-trenchcoat',
    prompt: `${CHARACTER_BASE} full body powerful standing pose, both hands in pockets of long black trench coat, black turtleneck underneath, black fitted trousers, black heeled boots, sunglasses pushed up on head, sharp cold confident gaze not smiling, looking slightly down at viewer, transparent background, no text no watermark`,
  },
  {
    name: 'ola-test-03-koala-hoodie',
    prompt: `${CHARACTER_BASE} full body wearing oversized white hoodie with cute koala ears on hood, sleeves covering hands showing only fingertips, grey shorts, fluffy slippers, hugging stuffed koala plush toy, eyes half-closed sleepy, slight pout, adorable cozy, transparent background, no text no watermark`,
  },
];

async function main() {
  // 1. Create ola-assets bucket if not exists
  console.log('Creating ola-assets bucket...');
  const { error: bucketError } = await supabase.storage.createBucket('ola-assets', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/png', 'image/webp', 'image/jpeg'],
  });
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Bucket creation failed:', bucketError.message);
    process.exit(1);
  }
  console.log('✅ ola-assets bucket ready');

  // 2. Generate and upload images sequentially (to avoid rate limits)
  const urls = [];
  for (const img of images) {
    console.log(`\nGenerating: ${img.name}...`);
    try {
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: img.prompt,
        n: 1,
        size: '1024x1536',
        quality: 'high',
      });

      const b64 = response.data[0].b64_json;
      const buffer = Buffer.from(b64, 'base64');
      const fileName = `${img.name}.png`;

      console.log(`Uploading ${fileName} (${(buffer.length / 1024).toFixed(0)} KB)...`);
      const { error: uploadError } = await supabase.storage
        .from('ola-assets')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload failed for ${fileName}:`, uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('ola-assets')
        .getPublicUrl(fileName);

      urls.push({ name: img.name, url: urlData.publicUrl });
      console.log(`✅ ${fileName} uploaded`);
    } catch (err) {
      console.error(`Failed to generate ${img.name}:`, err.message);
    }
  }

  // 3. Print all URLs
  console.log('\n========================================');
  console.log('Generated Ola Test Images:');
  console.log('========================================');
  for (const u of urls) {
    console.log(`\n${u.name}:`);
    console.log(u.url);
  }
  console.log('\n========================================');
}

main().catch(console.error);
