#!/usr/bin/env node
/**
 * Check all ola_assets video URLs for alpha channel transparency.
 * Outputs report to docs/diagnostics/video-alpha-check.md
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const VIDEOS = [
  { asset_id: 'b-01-dancing', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-01-dancing.webm', play_mode: 'loop' },
  { asset_id: 'b-02-confident-pose', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-02-confident-pose.webm', play_mode: 'action' },
  { asset_id: 'b-03-sleeping', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-03-sleeping.webm', play_mode: 'idle' },
  { asset_id: 'b-04-workout', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-04-workout.webm', play_mode: 'action' },
  { asset_id: 'b-05-teaching', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-05-teaching.webm', play_mode: 'action' },
  { asset_id: 'b-06-punching', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-06-punching.webm', play_mode: 'emotion' },
  { asset_id: 'b-07-nightclub', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-07-nightclub.webm', play_mode: 'loop' },
  { asset_id: 'b-08-ol-teaching', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-08-ol-teaching.webm', play_mode: 'idle' },
  { asset_id: 'b-09-thank-subscribe-kiss', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-09-thank-subscribe-kiss.webm', play_mode: 'action' },
  { asset_id: 'b-10-beg-subscribe', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-10-beg-subscribe.webm', play_mode: 'emotion' },
  { asset_id: 'b-11-outdoor-hiking', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-11-outdoor-hiking.webm', play_mode: 'action' },
  { asset_id: 'b-12-post-date-bliss', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-12-post-date-bliss.webm', play_mode: 'emotion' },
  { asset_id: 'b-13-too-full', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-13-too-full.webm', play_mode: 'emotion' },
  { asset_id: 'c-01-ol-front', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-01-ol-front.webm', play_mode: 'action' },
  { asset_id: 'c-02-ol-seated-legs-crossed', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-02-ol-seated-legs-crossed.webm', play_mode: 'idle' },
  { asset_id: 'c-02-ol-seated-legs-crossed-listen', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-02-ol-seated-legs-crossed-listen.webm', play_mode: 'idle' },
  { asset_id: 'c-03-ol-looking-back', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-03-ol-looking-back.webm', play_mode: 'action' },
  { asset_id: 'c-04-boss-trenchcoat', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-04-boss-trenchcoat.webm', play_mode: 'action' },
  { asset_id: 'c-04-boss-trenchcoat-half', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-04-boss-trenchcoat-half.webm', play_mode: 'idle' },
  { asset_id: 'c-05-wall-lean-disdain', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-05-wall-lean-disdain.webm', play_mode: 'action' },
  { asset_id: 'c-05-wall-lean-disdain-cool', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-05-wall-lean-disdain-cool.webm', play_mode: 'action' },
  { asset_id: 'c-06-evening-gown-toast', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-06-evening-gown-toast.webm', play_mode: 'action' },
  { asset_id: 'c-07-koala-hoodie-cute', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-07-koala-hoodie-cute.webm', play_mode: 'idle' },
  { asset_id: 'c-08-apron-cooking', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-08-apron-cooking.webm', play_mode: 'idle' },
  { asset_id: 'c-09-pajama-phone', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-09-pajama-phone.webm', play_mode: 'idle' },
  { asset_id: 'c-12-graduation', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/c-12-graduation.webm', play_mode: 'action' },
  { asset_id: 'h-01-night-listen-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-01-night-listen-nobg.webm', play_mode: 'idle' },
  { asset_id: 'h-02-morning-coffee-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-02-morning-coffee-nobg.webm', play_mode: 'action' },
  { asset_id: 'h-03-encouragement-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-03-encouragement-nobg.webm', play_mode: 'action' },
  { asset_id: 'h-04-late-study-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-04-late-study-nobg.webm', play_mode: 'idle' },
  { asset_id: 'h-05-serve-coffee-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-05-serve-coffee-nobg.webm', play_mode: 'action' },
  { asset_id: 'h-06-goodnight-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-06-goodnight-nobg.webm', play_mode: 'action' },
  { asset_id: 'h-07-queen-mode-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-07-queen-mode-nobg.webm', play_mode: 'action' },
  { asset_id: 'h-08-nerd-excited-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-08-nerd-excited-nobg.webm', play_mode: 'action' },
  { asset_id: 'h-09-bubbly-boba-nobg', video_url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-09-bubbly-boba-nobg.webm', play_mode: 'idle' },
];

const TMP_DIR = join(import.meta.dirname, '..', '.tmp-alpha-check');
const REPORT_PATH = join(import.meta.dirname, '..', 'docs', 'diagnostics', 'video-alpha-check.md');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 30_000 }).trim();
  } catch {
    return null;
  }
}

function getPixFmt(url) {
  const out = run(`ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "${url}"`);
  return out || 'unknown';
}

function checkCornerAlpha(url, assetId) {
  const framePath = join(TMP_DIR, `${assetId}.png`);
  const ok = run(`ffmpeg -y -v error -i "${url}" -vframes 1 -pix_fmt rgba "${framePath}" 2>&1`);
  if (ok === null) return { extracted: false };

  const info = run(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${framePath}"`);
  if (!info) return { extracted: false };

  const [w, h] = info.split(',').map(Number);
  if (!w || !h) return { extracted: false };

  const corners = [
    { name: 'top-left', x: 0, y: 0 },
    { name: 'top-right', x: w - 1, y: 0 },
    { name: 'bottom-left', x: 0, y: h - 1 },
    { name: 'bottom-right', x: w - 1, y: h - 1 },
  ];

  const results = [];
  for (const c of corners) {
    const raw = run(
      `ffmpeg -v error -i "${framePath}" -vf "crop=1:1:${c.x}:${c.y},format=rgba" -f rawvideo -pix_fmt rgba -frames:v 1 pipe:1 | xxd -p -l 4`
    );
    if (!raw || raw.length < 8) {
      results.push({ ...c, r: -1, g: -1, b: -1, a: -1 });
      continue;
    }
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    const a = parseInt(raw.slice(6, 8), 16);
    results.push({ ...c, r, g, b, a });
  }

  return { extracted: true, width: w, height: h, corners: results };
}

async function main() {
  mkdirSync(TMP_DIR, { recursive: true });

  console.log(`Checking ${VIDEOS.length} videos...\n`);

  const results = [];

  for (const v of VIDEOS) {
    process.stdout.write(`  ${v.asset_id} ... `);

    const pixFmt = getPixFmt(v.video_url);
    const hasAlphaCodec = pixFmt.includes('a') || pixFmt.startsWith('vp9') || pixFmt === 'yuva420p' || pixFmt === 'yuva444p';

    const frame = checkCornerAlpha(v.video_url, v.asset_id);

    let status;
    let detail = '';

    if (!frame.extracted) {
      status = '❓';
      detail = `pix_fmt=${pixFmt}, could not extract frame`;
    } else {
      const allTransparent = frame.corners.every(c => c.a >= 0 && c.a < 10);
      const someTransparent = frame.corners.some(c => c.a >= 0 && c.a < 10);

      if (hasAlphaCodec && allTransparent) {
        status = '✅';
        detail = `pix_fmt=${pixFmt}, all corners transparent`;
      } else if (hasAlphaCodec && someTransparent) {
        status = '⚠️';
        const opaqueCorners = frame.corners.filter(c => c.a >= 10).map(c => `${c.name}(a=${c.a})`).join(', ');
        detail = `pix_fmt=${pixFmt}, partial — opaque at: ${opaqueCorners}`;
      } else if (hasAlphaCodec && !allTransparent) {
        status = '⚠️';
        const cornerDetail = frame.corners.map(c => `${c.name}(rgba=${c.r},${c.g},${c.b},${c.a})`).join(', ');
        detail = `pix_fmt=${pixFmt}, has alpha channel but corners not transparent: ${cornerDetail}`;
      } else {
        status = '❌';
        const cornerDetail = frame.corners.map(c => `${c.name}(rgba=${c.r},${c.g},${c.b},${c.a})`).join(', ');
        detail = `pix_fmt=${pixFmt}, NO alpha channel — ${cornerDetail}`;
      }
    }

    console.log(status);
    results.push({ ...v, pixFmt, status, detail, frame });
  }

  // Generate report
  const pass = results.filter(r => r.status === '✅');
  const warn = results.filter(r => r.status === '⚠️');
  const fail = results.filter(r => r.status === '❌');
  const unknown = results.filter(r => r.status === '❓');

  let md = `# Ola 视频透明通道诊断报告

> 生成时间: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}
> 总计: ${VIDEOS.length} 个视频 | ✅ ${pass.length} | ⚠️ ${warn.length} | ❌ ${fail.length} | ❓ ${unknown.length}

## 判定标准

- **✅ 通过**: pix_fmt 含 alpha 通道，且第 1 帧四角像素 alpha < 10（透明）
- **⚠️ 警告**: 有 alpha 通道但四角不全透明（colorkey 不完美或角落有内容）
- **❌ 失败**: 无 alpha 通道（pix_fmt 不含 'a'），需要重新处理
- **❓ 未知**: 无法提取帧或探测失败

## 详细结果

| # | asset_id | play_mode | pix_fmt | 状态 | 说明 |
|---|----------|-----------|---------|------|------|
`;

  results.forEach((r, i) => {
    md += `| ${i + 1} | \`${r.asset_id}\` | ${r.play_mode} | \`${r.pixFmt}\` | ${r.status} | ${r.detail} |\n`;
  });

  if (fail.length > 0) {
    md += `\n## ❌ 需要重新处理的文件 (${fail.length})\n\n`;
    fail.forEach(r => {
      md += `- \`${r.asset_id}\` — ${r.detail}\n`;
    });
  }

  if (warn.length > 0) {
    md += `\n## ⚠️ 需要检查的文件 (${warn.length})\n\n`;
    warn.forEach(r => {
      md += `- \`${r.asset_id}\` — ${r.detail}\n`;
    });
  }

  if (pass.length > 0) {
    md += `\n## ✅ 通过的文件 (${pass.length})\n\n`;
    pass.forEach(r => {
      md += `- \`${r.asset_id}\`\n`;
    });
  }

  md += `\n---\n_由 scripts/check-video-alpha.mjs 自动生成_\n`;

  mkdirSync(join(import.meta.dirname, '..', 'docs', 'diagnostics'), { recursive: true });
  writeFileSync(REPORT_PATH, md);

  // Cleanup
  rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`\nReport written to: docs/diagnostics/video-alpha-check.md`);
  console.log(`  ✅ ${pass.length}  ⚠️ ${warn.length}  ❌ ${fail.length}  ❓ ${unknown.length}`);
}

main();
