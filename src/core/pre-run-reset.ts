import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import { ensureRunContext } from './run-context.js'

interface CommandResult {
  command: string
  ok: boolean
  output?: string
  error?: string
}

function runAdb(args: string[], options: { allowFail?: boolean } = {}): CommandResult {
  const command = `${env.adbPath} ${args.join(' ')}`
  try {
    const output = execFileSync(env.adbPath, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    }).trim()
    return { command, ok: true, output }
  } catch (err: any) {
    const output = `${err.stdout || ''}${err.stderr || ''}`.trim()
    const result = {
      command,
      ok: false,
      output,
      error: output || err.message || String(err),
    }
    if (!options.allowFail) {
      throw new Error(`ADB 命令执行失败：${command}\n${result.error}`)
    }
    return result
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function parseAppProcesses(psOutput: string, packageName: string): string[] {
  return psOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes(packageName))
}

async function writeResetReport(results: CommandResult[], beforeProcesses: string[], afterProcesses: string[]) {
  const run = ensureRunContext()
  const file = path.join(run.runDir, 'pre-run-reset.json')
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify({
    enabled: env.resetAppBeforeRun,
    packageName: env.androidAppPackage,
    deviceName: env.androidDeviceName,
    clearData: env.resetAppClearDataBeforeRun,
    removeForwards: env.resetAdbForwardsBeforeRun,
    beforeProcesses,
    afterProcesses,
    commands: results,
    createdAt: new Date().toISOString(),
  }, null, 2))
}

export async function performPreRunReset(): Promise<void> {
  const results: CommandResult[] = []
  const serial = env.androidDeviceName
  const pkg = env.androidAppPackage

  if (!env.resetAppBeforeRun) {
    await writeResetReport([], [], [])
    console.log('[pre-run-reset] skipped: RESET_APP_BEFORE_RUN=false')
    return
  }

  if (!serial || !pkg) {
    throw new Error('RESET_APP_BEFORE_RUN=true 时必须配置 ANDROID_DEVICE_NAME 和 ANDROID_APP_PACKAGE')
  }

  const adb = (...args: string[]) => {
    const result = runAdb(['-s', serial, ...args], { allowFail: true })
    results.push(result)
    return result
  }

  console.log(`[pre-run-reset] reset app state before tests: device=${serial}, package=${pkg}`)

  // 确认设备在线；这一步失败应直接中止，避免后续 Appium 才失败。
  results.push(runAdb(['-s', serial, 'get-state']))

  const psBefore = adb('shell', 'ps', '-A')
  const beforeProcesses = parseAppProcesses(psBefore.output || '', pkg)

  // 清理上一次 Chromedriver/Appium 留下的 adb forward，减少 WebView attach 到旧 socket 的概率。
  if (env.resetAdbForwardsBeforeRun) {
    adb('forward', '--remove-all')
  }

  // force-stop 会停止该 package 下所有进程，包括 :webview / :remote 等子进程。
  adb('shell', 'am', 'force-stop', pkg)

  // pm clear 会清应用数据，并隐式停止 app；用于保证每次运行前是干净状态。
  if (env.resetAppClearDataBeforeRun) {
    adb('shell', 'pm', 'clear', pkg)
  }

  // 再 force-stop 一次，确保 pm clear 后没有残余/重启进程。
  adb('shell', 'am', 'force-stop', pkg)

  if (env.resetAppWaitMs > 0) {
    await sleep(env.resetAppWaitMs)
  }

  const psAfter = adb('shell', 'ps', '-A')
  const afterProcesses = parseAppProcesses(psAfter.output || '', pkg)

  await writeResetReport(results, beforeProcesses, afterProcesses)

  if (afterProcesses.length > 0) {
    console.warn(`[pre-run-reset] warning: package processes still exist after reset:\n${afterProcesses.join('\n')}`)
  } else {
    console.log('[pre-run-reset] done: app data/process state cleaned')
  }
}
