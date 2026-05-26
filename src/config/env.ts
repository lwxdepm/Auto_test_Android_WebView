import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { resolveSuiteName } from '../core/reporting.js'

dotenv.config()

// 固定 Appium 3 扩展目录，避免 Appium 在 pnpm 项目中调用 npm install 修改当前工程依赖。
// Windows npm/pnpm scripts 会设置同样的 APPIUM_HOME；这里兜底给 wdio/appium-service 使用。
process.env.APPIUM_HOME ||= path.resolve(process.cwd(), '.appium')

// 运行时状态文件必须固定解析到项目根目录，不能依赖启动命令的 cwd。
// 否则从父目录用 `pnpm --dir Auto_test_Android_WebView ...` 或 IDE 启动时，
// `.test-state/phone-sequence.json` 可能被写到不同目录，导致下一次运行又从 base 开始。
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return ['1', 'true', 'yes', 'y', 'on'].includes(raw.toLowerCase())
}

function num(name: string, fallback: number): number {
  const raw = process.env[name]
  const parsed = raw == null ? NaN : Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function str(name: string, fallback = ''): string {
  return process.env[name] || fallback
}

function maskPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

function assertPhoneLike(name: string, value: string): void {
  if (!/^1[3-9]\d{9}$/.test(value)) {
    throw new Error(`${name} 必须是 11 位中国大陆手机号格式，当前=${value}`)
  }
}

function nextPhone(phone: string): string {
  return String(BigInt(phone) + 1n).padStart(phone.length, '0')
}

function resolveProjectStateFile(stateFile: string): string {
  return path.isAbsolute(stateFile) ? stateFile : path.resolve(projectRoot, stateFile)
}

function allocateIncrementalPhone(base: string, stateFile: string, poolKey: string, baseName: string): string {
  assertPhoneLike(baseName, base)
  const resolvedStateFile = resolveProjectStateFile(stateFile)
  let nextCandidate: string | undefined
  let parsedState: Record<string, any> = {}

  try {
    parsedState = JSON.parse(fs.readFileSync(resolvedStateFile, 'utf8')) as Record<string, any>
    const existing = parsedState[poolKey]
    if (existing?.base === base) {
      if (existing.nextCandidate) {
        nextCandidate = String(existing.nextCandidate)
      } else if (existing.lastAllocated) {
        // 兼容旧格式：旧状态只存 lastAllocated，下次从 lastAllocated + 1 开始。
        nextCandidate = nextPhone(String(existing.lastAllocated))
      }
    }
  } catch {
    // 第一次运行或状态文件不存在时从 base 开始。
  }

  const allocated = nextCandidate || base
  const next = nextPhone(allocated)

  assertPhoneLike(`allocated ${poolKey}`, allocated)
  assertPhoneLike(`next ${poolKey}`, next)

  fs.mkdirSync(path.dirname(resolvedStateFile), { recursive: true })
  parsedState[poolKey] = {
    base,
    lastAllocated: allocated,
    nextCandidate: next,
    stateFile: path.relative(projectRoot, resolvedStateFile),
    allocatedCount: Number(parsedState[poolKey]?.allocatedCount || 0) + 1,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(resolvedStateFile, JSON.stringify(parsedState, null, 2))

  return allocated
}

export const env = {
  appiumHost: str('APPIUM_HOST', '127.0.0.1'),
  appiumPort: num('APPIUM_PORT', 4723),
  adbPath: str('ADB_PATH', 'adb'),
  startAppium: bool('START_APPIUM', false),

  androidDeviceName: str('ANDROID_DEVICE_NAME', 'emulator-5554'),
  androidPlatformVersion: str('ANDROID_PLATFORM_VERSION', ''),
  androidAppPackage: str('ANDROID_APP_PACKAGE', ''),
  androidAppActivity: str('ANDROID_APP_ACTIVITY', ''),
  androidNoReset: bool('ANDROID_NO_RESET', false),
  androidDontStopAppOnReset: bool('ANDROID_DONT_STOP_APP_ON_RESET', true),
  androidFullReset: bool('ANDROID_FULL_RESET', false),
  androidAutoGrantPermissions: bool('ANDROID_AUTO_GRANT_PERMISSIONS', true),
  androidDisableWindowAnimation: bool('ANDROID_DISABLE_WINDOW_ANIMATION', true),
  androidNewCommandTimeoutSeconds: num('ANDROID_NEW_COMMAND_TIMEOUT_SECONDS', 180),
  uiautomator2ServerReadTimeoutMs: num('UIAUTOMATOR2_SERVER_READ_TIMEOUT_MS', 10000),

  appiumSkipLogcatCapture: bool('APPIUM_SKIP_LOGCAT_CAPTURE', true),

  fastTeardown: bool('FAST_TEARDOWN', true),
  postRunForceStopApp: bool('POST_RUN_FORCE_STOP_APP', true),
  postRunRemoveAdbForwards: bool('POST_RUN_REMOVE_ADB_FORWARDS', true),

  webviewContextPattern: str('WEBVIEW_CONTEXT_PATTERN', 'WEBVIEW'),
  webviewContextTimeoutMs: num('WEBVIEW_CONTEXT_TIMEOUT_MS', 30000),
  webdriverConnectionRetryTimeoutMs: num('WEBDRIVER_CONNECTION_RETRY_TIMEOUT_MS', 20000),
  chromedriverExecutableDir: str('CHROMEDRIVER_EXECUTABLE_DIR', ''),

  smsFixedCode: str('SMS_FIXED_CODE', '123'),
  testPhoneA: str('TEST_PHONE_A', '13800000001'),
  testPhoneB: str('TEST_PHONE_B', '13800000002'),
  testPhoneNeedsProfile: str('TEST_PHONE_NEEDS_PROFILE', ''),
  testPhoneNeedsProfileAutoIncrement: bool('TEST_PHONE_NEEDS_PROFILE_AUTO_INCREMENT', false),
  testPhoneNeedsProfileBase: str('TEST_PHONE_NEEDS_PROFILE_BASE', '19900010000'),
  testPhoneNeedsProfileStateFile: str('TEST_PHONE_NEEDS_PROFILE_STATE_FILE', '.test-state/phone-sequence.json'),
  testPhoneMaterialsEmpty: str('TEST_PHONE_MATERIALS_EMPTY', ''),
  testPhoneMaterialsEmptyAutoIncrement: bool('TEST_PHONE_MATERIALS_EMPTY_AUTO_INCREMENT', true),
  testPhoneMaterialsEmptyBase: str('TEST_PHONE_MATERIALS_EMPTY_BASE', '19900020000'),
  testPhoneMaterialsCard: str('TEST_PHONE_MATERIALS_CARD', ''),
  testPhoneMaterialsCardAutoIncrement: bool('TEST_PHONE_MATERIALS_CARD_AUTO_INCREMENT', true),
  testPhoneMaterialsCardBase: str('TEST_PHONE_MATERIALS_CARD_BASE', '19900030000'),
  testPhoneNoHealthConsent: str('TEST_PHONE_NO_HEALTH_CONSENT', ''),
  testPhoneNoHealthConsentAutoIncrement: bool('TEST_PHONE_NO_HEALTH_CONSENT_AUTO_INCREMENT', true),
  testPhoneNoHealthConsentBase: str('TEST_PHONE_NO_HEALTH_CONSENT_BASE', '19900040000'),
  testPhoneMedicalPurge: str('TEST_PHONE_MEDICAL_PURGE', ''),
  testPhoneMedicalPurgeAutoIncrement: bool('TEST_PHONE_MEDICAL_PURGE_AUTO_INCREMENT', true),
  testPhoneMedicalPurgeBase: str('TEST_PHONE_MEDICAL_PURGE_BASE', '19900050000'),
  testPhoneMedicalDoc: str('TEST_PHONE_MEDICAL_DOC', ''),
  testPhoneMedicalDocAutoIncrement: bool('TEST_PHONE_MEDICAL_DOC_AUTO_INCREMENT', false),
  testPhoneMedicalDocBase: str('TEST_PHONE_MEDICAL_DOC_BASE', '19900060000'),
  testPhoneBusiness: str('TEST_PHONE_BUSINESS', ''),
  testPhoneBusinessAutoIncrement: bool('TEST_PHONE_BUSINESS_AUTO_INCREMENT', false),
  testPhoneBusinessBase: str('TEST_PHONE_BUSINESS_BASE', '19900070000'),
  testPhoneMaterialsFull: str('TEST_PHONE_MATERIALS_FULL', ''),
  testPhoneMaterialsFullAutoIncrement: bool('TEST_PHONE_MATERIALS_FULL_AUTO_INCREMENT', true),
  testPhoneMaterialsFullBase: str('TEST_PHONE_MATERIALS_FULL_BASE', '19900080000'),
  testPhonePending: str('TEST_PHONE_PENDING', '13800000003'),

  seedCommunicationCardBeforeCases: bool('SEED_COMMUNICATION_CARD_BEFORE_CASES', true),
  useDynamicEmptyMaterialsAccount: bool('USE_DYNAMIC_EMPTY_MATERIALS_ACCOUNT', true),
  useDynamicNoHealthConsentAccount: bool('USE_DYNAMIC_NO_HEALTH_CONSENT_ACCOUNT', true),
  ensureKnownMedicalProfileForFastCases: bool('ENSURE_KNOWN_MEDICAL_PROFILE_FOR_FAST_CASES', true),

  resetAppBeforeRun: bool('RESET_APP_BEFORE_RUN', true),
  resetAppClearDataBeforeRun: bool('RESET_APP_CLEAR_DATA_BEFORE_RUN', true),
  resetAdbForwardsBeforeRun: bool('RESET_ADB_FORWARDS_BEFORE_RUN', true),
  resetAppWaitMs: num('RESET_APP_WAIT_MS', 2000),

  clearAppBeforeSuite: bool('CLEAR_APP_BEFORE_SUITE', false),
  recordLogcat: bool('RECORD_LOGCAT', true),
  reportKeepRuns: num('REPORT_KEEP_RUNS', 30),
  testSuiteName: resolveSuiteName(),
  restartAppCaseEnabled: bool('RESTART_APP_CASE_ENABLED', false),
  chatLongHistoryTurns: num('CHAT_LONG_HISTORY_TURNS', 16),
}

/**
 * 为“未完善资料新账号”即时分配一个递增手机号。
 * 只在真正执行需要新账号的用例前调用，避免 `doctor`、覆盖率统计、
 * 以及不涉及 Profile 首次流程的套件消耗手机号。
 */
export function allocateNextNeedsProfilePhone(): string {
  if (!env.testPhoneNeedsProfileAutoIncrement) {
    return env.testPhoneNeedsProfile
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneNeedsProfileBase,
    env.testPhoneNeedsProfileStateFile,
    'needsProfile',
    'TEST_PHONE_NEEDS_PROFILE_BASE',
  )
  process.env.TEST_PHONE_NEEDS_PROFILE = allocated
  env.testPhoneNeedsProfile = allocated

  console.log(`[dynamic-env] TEST_PHONE_NEEDS_PROFILE=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneNeedsProfileBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextMaterialsEmptyPhone(): string {
  if (!env.testPhoneMaterialsEmptyAutoIncrement) {
    return env.testPhoneMaterialsEmpty
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneMaterialsEmptyBase,
    env.testPhoneNeedsProfileStateFile,
    'materialsEmpty',
    'TEST_PHONE_MATERIALS_EMPTY_BASE',
  )
  process.env.TEST_PHONE_MATERIALS_EMPTY = allocated
  env.testPhoneMaterialsEmpty = allocated
  console.log(`[dynamic-env] TEST_PHONE_MATERIALS_EMPTY=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneMaterialsEmptyBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextMaterialsCardPhone(): string {
  if (!env.testPhoneMaterialsCardAutoIncrement) {
    return env.testPhoneMaterialsCard
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneMaterialsCardBase,
    env.testPhoneNeedsProfileStateFile,
    'materialsCard',
    'TEST_PHONE_MATERIALS_CARD_BASE',
  )
  process.env.TEST_PHONE_MATERIALS_CARD = allocated
  env.testPhoneMaterialsCard = allocated
  console.log(`[dynamic-env] TEST_PHONE_MATERIALS_CARD=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneMaterialsCardBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextNoHealthConsentPhone(): string {
  if (!env.testPhoneNoHealthConsentAutoIncrement) {
    return env.testPhoneNoHealthConsent
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneNoHealthConsentBase,
    env.testPhoneNeedsProfileStateFile,
    'noHealthConsent',
    'TEST_PHONE_NO_HEALTH_CONSENT_BASE',
  )
  process.env.TEST_PHONE_NO_HEALTH_CONSENT = allocated
  env.testPhoneNoHealthConsent = allocated
  console.log(`[dynamic-env] TEST_PHONE_NO_HEALTH_CONSENT=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneNoHealthConsentBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextMedicalPurgePhone(): string {
  if (!env.testPhoneMedicalPurgeAutoIncrement) {
    return env.testPhoneMedicalPurge
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneMedicalPurgeBase,
    env.testPhoneNeedsProfileStateFile,
    'medicalPurge',
    'TEST_PHONE_MEDICAL_PURGE_BASE',
  )
  process.env.TEST_PHONE_MEDICAL_PURGE = allocated
  env.testPhoneMedicalPurge = allocated
  console.log(`[dynamic-env] TEST_PHONE_MEDICAL_PURGE=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneMedicalPurgeBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextMedicalDocPhone(): string {
  if (!env.testPhoneMedicalDocAutoIncrement) {
    return env.testPhoneMedicalDoc
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneMedicalDocBase,
    env.testPhoneNeedsProfileStateFile,
    'medicalDoc',
    'TEST_PHONE_MEDICAL_DOC_BASE',
  )
  process.env.TEST_PHONE_MEDICAL_DOC = allocated
  env.testPhoneMedicalDoc = allocated
  console.log(`[dynamic-env] TEST_PHONE_MEDICAL_DOC=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneMedicalDocBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextBusinessPhone(): string {
  if (!env.testPhoneBusinessAutoIncrement) {
    return env.testPhoneBusiness
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneBusinessBase,
    env.testPhoneNeedsProfileStateFile,
    'business',
    'TEST_PHONE_BUSINESS_BASE',
  )
  process.env.TEST_PHONE_BUSINESS = allocated
  env.testPhoneBusiness = allocated
  console.log(`[dynamic-env] TEST_PHONE_BUSINESS=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneBusinessBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextMaterialsFullPhone(): string {
  if (!env.testPhoneMaterialsFullAutoIncrement) {
    return env.testPhoneMaterialsFull
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneMaterialsFullBase,
    env.testPhoneNeedsProfileStateFile,
    'materialsFull',
    'TEST_PHONE_MATERIALS_FULL_BASE',
  )
  process.env.TEST_PHONE_MATERIALS_FULL = allocated
  env.testPhoneMaterialsFull = allocated
  console.log(`[dynamic-env] TEST_PHONE_MATERIALS_FULL=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneMaterialsFullBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function validateRuntimeEnv() {
  const missing: string[] = []
  if (!env.androidAppPackage) missing.push('ANDROID_APP_PACKAGE')
  if (!env.androidAppActivity) missing.push('ANDROID_APP_ACTIVITY')
  return missing
}
