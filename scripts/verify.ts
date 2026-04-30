#!/usr/bin/env node
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function waitForServer(url: string, maxMs = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

async function isServerRunning(): Promise<boolean> {
  try {
    await fetch('http://localhost:3000', { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

async function runSubprocess(cmd: string, timeout = 120000): Promise<{ out: string; ok: boolean }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout,
      env: { ...process.env },
    });
    process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    return { out: stdout, ok: true };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    if (err.stdout) process.stdout.write(err.stdout);
    if (err.stderr) process.stderr.write(err.stderr);
    return { out: err.stdout ?? '', ok: false };
  }
}

async function main() {
  console.log('\n🐨 Koala 完整验收系统');
  console.log('══════════════════════════════════════\n');

  // Step 1: Build check
  console.log('📦 检查构建...');
  const buildResult = await runSubprocess('npm run build');
  if (!buildResult.ok) {
    console.error('❌ 构建失败');
    process.exit(1);
  }
  console.log('✅ 构建通过\n');

  // Step 2: Start server if not running
  let serverProcess: ReturnType<typeof spawn> | null = null;
  const alreadyRunning = await isServerRunning();

  if (!alreadyRunning) {
    console.log('🚀 启动服务器...');
    serverProcess = spawn('npx', ['next', 'start'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const ready = await waitForServer('http://localhost:3000', 20000);
    if (!ready) {
      console.error('❌ 服务器启动超时');
      serverProcess.kill();
      process.exit(1);
    }
    console.log('✅ 服务器已启动\n');
  } else {
    console.log('✅ 服务器已在运行\n');
  }

  let checksPassed = false;
  let evalPassed = false;

  try {
    // Step 3: Run feature checks
    console.log('🔍 运行功能验收检查...\n');
    const checkResult = await runSubprocess('npx tsx scripts/check-all.ts', 120000);
    checksPassed = checkResult.out.includes('未通过: 0') || (!checkResult.out.includes('❌ 未通过') && checkResult.ok);

    // Step 4: Run eval
    console.log('\n🧪 运行 AI 评测系统...\n');
    const evalResult = await runSubprocess('npx tsx app/lib/eval/run-all.ts', 300000);
    evalPassed = evalResult.out.includes('✅ PASS') && !evalResult.out.includes('❌ FAIL');
  } finally {
    if (serverProcess) {
      serverProcess.kill();
      console.log('\n服务器已停止');
    }
  }

  const allPassed = checksPassed && evalPassed;
  console.log('\n══════════════════════════════════════');
  console.log(allPassed ? '✅ 所有验收通过' : '❌ 部分验收未通过');
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error('验收系统错误:', e);
  process.exit(1);
});
