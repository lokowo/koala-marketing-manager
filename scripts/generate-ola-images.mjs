import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'images', 'ola');

// Load .env.local
try {
  const envPath = join(ROOT, '.env.local');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is not set. Set it in .env.local or environment.');
  process.exit(1);
}

const BASE_PROMPT = `A cute cartoon koala character named Ola, geometric minimalist style like Duolingo's Duo owl. Round chubby body, large fluffy round ears (gray fur #A39E99, light inner ear #C4BAB2), big round eyes, black oval nose, wearing a green PhD graduation cap (#0D7C5F) with gold tassel (#FFD700). White/cream belly patch. Pink blush on cheeks. Clean flat style, no gradients, no shadows, solid colors, transparent background. Character is`;

const EXPRESSIONS = [
  { state: 'welcome', desc: 'waving one hand warmly, smiling sweetly, cap sitting straight, friendly welcoming pose' },
  { state: 'thinking', desc: 'hand on chin, one eye squinting, head slightly tilted, thought bubbles floating above, contemplating' },
  { state: 'celebrate', desc: 'both arms raised up high, star-shaped golden eyes, cap thrown in the air above head, confetti around, big happy smile, pink blush cheeks' },
  { state: 'suggest', desc: 'one arm pointing to the right, gentle smile, small lightbulb icon near pointing hand, helpful pose' },
  { state: 'sleepy', desc: 'eyes closed in curved lines, head tilted to one side, small zzz floating above, peaceful sleeping expression, cap slightly askew' },
  { state: 'cheer', desc: 'holding a small pink flag that says GO, enthusiastic smile, one arm raised with flag, encouraging pose' },
  { state: 'surprise', desc: 'star-shaped golden eyes, mouth in small O shape, cap popping up off head, pink blush, amazed expression' },
  { state: 'focus', desc: 'wearing small round glasses over eyes, serious straight-line mouth, concentrated determined expression, studious look' },
];

const SIZES = [512, 128];

async function generateImage(prompt, size) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: `${size}x${size}`,
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return Buffer.from(data.data[0].b64_json, 'base64');
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let generated = 0;
  let failed = 0;

  for (const expr of EXPRESSIONS) {
    const prompt = `${BASE_PROMPT} ${expr.desc}`;

    for (const size of SIZES) {
      const filename = `ola-${expr.state}-${size}.png`;
      const outPath = join(OUT_DIR, filename);

      if (existsSync(outPath)) {
        console.log(`⏭  ${filename} already exists, skipping`);
        generated++;
        continue;
      }

      console.log(`🎨 Generating ${filename}...`);
      try {
        const buf = await generateImage(prompt, size);
        writeFileSync(outPath, buf);
        console.log(`✅ ${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
        generated++;
      } catch (err) {
        console.error(`❌ ${filename}: ${err.message}`);
        failed++;
      }

      // Rate limit: brief pause between requests
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\nDone: ${generated} generated, ${failed} failed`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
