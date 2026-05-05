#!/usr/bin/env tsx

import { runApiTests } from './test-api';
import { runAiChatTests } from './test-ai-chat';
import { runKnowledgeTests } from './test-knowledge';
import { runMatchingTests } from './test-matching';
import { runEmailTests } from './test-email';
import { runAntiHallucinationTests } from './test-anti-hallucination';
import { printReport, printModuleDetails } from './report';

const BASE = 'http://localhost:3000';

async function checkServerRunning(): Promise<boolean> {
  try {
    await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  console.log('\n🐨 Koala 自动化评测系统');
  console.log('检查服务器状态...');

  const running = await checkServerRunning();
  if (!running) {
    console.error('❌ 服务器未运行，请先运行: npm run dev 或 npm start');
    console.error('   然后重新运行: npm run eval');
    process.exit(1);
  }
  console.log('✅ 服务器已连接\n');

  const results = [];

  console.log('运行 API 功能测试...');
  const apiResult = await runApiTests();
  results.push(apiResult);
  if (verbose) printModuleDetails(apiResult);

  console.log('运行 AI 对话质量测试...');
  const aiResult = await runAiChatTests();
  results.push(aiResult);
  if (verbose) printModuleDetails(aiResult);

  console.log('运行 知识库检索测试...');
  const kbResult = await runKnowledgeTests();
  results.push(kbResult);
  if (verbose) printModuleDetails(kbResult);

  console.log('运行 教授匹配测试...');
  const matchResult = await runMatchingTests();
  results.push(matchResult);
  if (verbose) printModuleDetails(matchResult);

  console.log('运行 申请信质量测试...');
  const emailResult = await runEmailTests();
  results.push(emailResult);
  if (verbose) printModuleDetails(emailResult);

  console.log('运行 反幻觉测试...');
  const halResult = await runAntiHallucinationTests();
  results.push(halResult);
  if (verbose) printModuleDetails(halResult);

  console.log('\n');
  const passed = printReport(results);

  if (!passed) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('评测运行失败:', e);
  process.exit(1);
});
