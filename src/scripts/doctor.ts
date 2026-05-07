import { execSync } from 'node:child_process'
import { env, validateRuntimeEnv } from '../config/env.js'

function quote(cmd: string) {
  return cmd.includes(' ') ? `"${cmd}"` : cmd
}

function run(cmd: string): { ok: boolean; output: string } {
  try {
    return { ok: true, output: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
  } catch (err: any) {
    const output = `${err.stdout || ''}${err.stderr || ''}`.trim() || err.message
    return { ok: false, output }
  }
}

function print(name: string, result: { ok: boolean; output: string }) {
  const icon = result.ok ? '✅' : '❌'
  console.log(`${icon} ${name}`)
  if (result.output) console.log(result.output.split('\n').map((line) => `   ${line}`).join('\n'))
}

const adb = quote(env.adbPath)
const serial = env.androidDeviceName

console.log('Appium Android WebView 自动化环境检查\n')

print('Node.js', run('node --version'))
print('pnpm', run('pnpm --version'))
print('adb', run(`${adb} version`))
print('adb devices', run(`${adb} devices`))
if (serial) {
  print('adb get-state', run(`${adb} -s ${serial} get-state`))
  print('Android version', run(`${adb} -s ${serial} shell getprop ro.build.version.release`))
  if (env.androidAppPackage) {
    print('App installed', run(`${adb} -s ${serial} shell pm path ${env.androidAppPackage}`))
    print('App main process pid', run(`${adb} -s ${serial} shell pidof ${env.androidAppPackage}`))
  }
}
print('appium', run('appium --version'))
print('appium drivers', run('appium driver list --installed'))

const missing = validateRuntimeEnv()
if (missing.length > 0) {
  console.log('\n❌ 缺少必要环境变量：')
  for (const item of missing) console.log(`   ${item}`)
  console.log('\n请复制 .env.example 为 .env，并填写 App 包名、Activity、设备信息。')
  process.exitCode = 1
} else {
  console.log('\n✅ 必要环境变量已配置')
}

console.log('\n提示：如果 Appium 找不到 WEBVIEW，请确认 Android 测试包已开启 WebView.setWebContentsDebuggingEnabled(true)。')
