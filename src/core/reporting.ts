import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export type FailureType = 'product_bug' | 'script_error' | 'env_error' | 'data_error' | 'third_party_error' | 'flaky'

export interface CaseRecordForReporting {
  caseId: string
  title: string
  module?: string
  subFunction?: string
  priority?: string
  difficulty?: string
  status: 'passed' | 'failed' | 'skipped'
  startedAt: string
  endedAt?: string
  durationMs?: number
  error?: string
  tags?: string[]
  workerPid?: number
  failureType?: FailureType
  failureReason?: string
  isBlocking?: boolean
  isFlaky?: boolean
}

export interface RunSummaryContext {
  runId: string
  suite: string
  startedAt: string
  endedAt: string
  runDir: string
  artifactsDir: string
}

interface CaseDetail {
  caseId: string
  title: string
  reason: string
  module?: string
  subFunction?: string
  priority?: string
  tags?: string[]
  durationMs?: number
  startedAt: string
  endedAt?: string
}

interface FailedCaseDetail extends CaseDetail {
  failureType: FailureType
  failureReason: string
  isBlocking: boolean
  isFlaky: boolean
  artifactDir: string
}

export interface RunSummary {
  runId: string
  suite: string
  startedAt: string
  endedAt: string
  durationMs: number
  total: number
  passed: number
  failed: number
  skipped: number
  passRate: number
  avgCaseDurationMs: number
  p0PassRate: number | null
  p1PassRate: number | null
  blockingDefects: number
  flakyCases: number
  failedCases: string[]
  failedCaseDetails: FailedCaseDetail[]
  skippedCases: string[]
  skippedCaseDetails: CaseDetail[]
}

export interface EnvironmentReportInput {
  runId: string
  startedAt: string
  projectRoot: string
  processEnv?: Record<string, string | undefined>
  processInfo?: {
    node: string
    platform: NodeJS.Platform | string
    arch: NodeJS.Architecture | string
  }
  toolVersions?: Partial<EnvironmentSnapshot['runner']>
  deviceInfo?: Partial<EnvironmentSnapshot['device']>
}

export interface EnvironmentSnapshot {
  runId: string
  startedAt: string
  createdAt: string
  node: string
  platform: string
  arch: string
  cwd: string
  app: {
    package?: string
    activity?: string
    versionName?: string
    versionCode?: string
    buildType?: string
  }
  h5: {
    baseUrl?: string
    commit?: string
    buildTime?: string
  }
  backend: {
    env?: string
    apiBaseUrl?: string
  }
  device: {
    deviceName?: string
    manufacturer?: string
    brand?: string
    model?: string
    androidVersion?: string
    sdkVersion?: string
    webviewVersion?: string
  }
  testData: {
    accountProfile: string
    accounts: Record<string, string>
    clearDataBeforeRun: boolean
    destructiveCasesEnabled: boolean
  }
  runner: {
    node: string
    pnpm?: string
    appium?: string
    webdriverio?: string
    typescript?: string
    platform: string
  }
  env: {
    ANDROID_DEVICE_NAME?: string
    ANDROID_PLATFORM_VERSION?: string
    ANDROID_APP_PACKAGE?: string
    ANDROID_APP_ACTIVITY?: string
    APPIUM_HOST?: string
    APPIUM_PORT?: string
    WEBVIEW_CONTEXT_PATTERN?: string
    TEST_SUITE_NAME?: string
  }
}

function toKebabSuiteName(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
}

export function resolveSuiteName(argv = process.argv, processEnv: Record<string, string | undefined> = process.env): string {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--suite' && argv[i + 1]) {
      return toKebabSuiteName(argv[i + 1])
    }
    if (arg.startsWith('--suite=')) {
      const value = arg.slice('--suite='.length)
      if (value) return toKebabSuiteName(value)
    }
  }
  if (processEnv.TEST_SUITE_NAME) return toKebabSuiteName(processEnv.TEST_SUITE_NAME)
  return 'all'
}

const accountKeys = [
  'TEST_PHONE_A',
  'TEST_PHONE_B',
  'TEST_PHONE_NEEDS_PROFILE',
  'TEST_PHONE_MATERIALS_EMPTY',
  'TEST_PHONE_MATERIALS_CARD',
  'TEST_PHONE_MATERIALS_FULL',
  'TEST_PHONE_NO_HEALTH_CONSENT',
  'TEST_PHONE_MEDICAL_PURGE',
  'TEST_PHONE_MEDICAL_DOC',
  'TEST_PHONE_BUSINESS',
  'TEST_PHONE_PENDING',
]

function bool(value: string | undefined, fallback = false): boolean {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase())
}

function versionFromRange(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value.replace(/^[~^]/, '')
}

export function maskPhone(phone: string | undefined): string {
  if (!phone) return ''
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

function accountState(processEnv: Record<string, string | undefined>, key: string): string {
  const value = processEnv[key]
  if (value) return /^1[3-9]\d{9}$/.test(value) ? maskPhone(value) : 'configured'
  const autoIncrementKey = `${key}_AUTO_INCREMENT`
  return bool(processEnv[autoIncrementKey]) ? 'dynamic' : 'not_configured'
}

export function readRunnerToolVersions(projectRoot: string): Partial<EnvironmentSnapshot['runner']> {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
      packageManager?: string
      devDependencies?: Record<string, string>
      dependencies?: Record<string, string>
    }
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
    return {
      pnpm: pkg.packageManager?.startsWith('pnpm@') ? pkg.packageManager.slice('pnpm@'.length) : undefined,
      appium: versionFromRange(deps.appium),
      webdriverio: versionFromRange(deps.webdriverio),
      typescript: versionFromRange(deps.typescript),
    }
  } catch {
    return {}
  }
}

function adbShell(processEnv: Record<string, string | undefined>, args: string[]): string | undefined {
  const adbPath = processEnv.ADB_PATH || 'adb'
  const deviceName = processEnv.ANDROID_DEVICE_NAME
  if (!deviceName) return undefined
  try {
    return execFileSync(adbPath, ['-s', deviceName, 'shell', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim()
  } catch {
    return undefined
  }
}

export function collectDeviceInfoFromAdb(processEnv: Record<string, string | undefined> = process.env): Partial<EnvironmentSnapshot['device']> {
  return {
    manufacturer: adbShell(processEnv, ['getprop', 'ro.product.manufacturer']),
    brand: adbShell(processEnv, ['getprop', 'ro.product.brand']),
    model: adbShell(processEnv, ['getprop', 'ro.product.model']),
    androidVersion: adbShell(processEnv, ['getprop', 'ro.build.version.release']),
    sdkVersion: adbShell(processEnv, ['getprop', 'ro.build.version.sdk']),
    webviewVersion: adbShell(processEnv, ['cmd', 'webviewupdate', 'getCurrentWebViewPackage']),
  }
}

export function buildEnvironmentReport(input: EnvironmentReportInput): EnvironmentSnapshot {
  const processEnv = input.processEnv ?? process.env
  const processInfo = input.processInfo ?? {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  }
  const toolVersions = input.toolVersions ?? {}
  const deviceInfo = input.deviceInfo ?? {}
  const accounts = Object.fromEntries(accountKeys.map((key) => [key, accountState(processEnv, key)]))
  const destructiveCasesEnabled = Boolean(
    processEnv.TEST_PHONE_MEDICAL_PURGE ||
    bool(processEnv.TEST_PHONE_MEDICAL_PURGE_AUTO_INCREMENT) ||
    processEnv.TEST_PHONE_PENDING,
  )

  return {
    runId: input.runId,
    startedAt: input.startedAt,
    createdAt: new Date().toISOString(),
    node: processInfo.node,
    platform: String(processInfo.platform),
    arch: String(processInfo.arch),
    cwd: input.projectRoot,
    app: {
      package: processEnv.ANDROID_APP_PACKAGE,
      activity: processEnv.ANDROID_APP_ACTIVITY,
      versionName: processEnv.APP_VERSION_NAME || processEnv.ANDROID_APP_VERSION_NAME,
      versionCode: processEnv.APP_VERSION_CODE || processEnv.ANDROID_APP_VERSION_CODE,
      buildType: processEnv.APP_BUILD_TYPE || processEnv.ANDROID_APP_BUILD_TYPE,
    },
    h5: {
      baseUrl: processEnv.H5_BASE_URL,
      commit: processEnv.H5_COMMIT || processEnv.H5_COMMIT_SHA || processEnv.GIT_COMMIT,
      buildTime: processEnv.H5_BUILD_TIME,
    },
    backend: {
      env: processEnv.BACKEND_ENV || processEnv.APP_ENV || processEnv.NODE_ENV,
      apiBaseUrl: processEnv.API_BASE_URL || processEnv.BACKEND_API_BASE_URL,
    },
    device: {
      deviceName: processEnv.ANDROID_DEVICE_NAME,
      manufacturer: deviceInfo.manufacturer,
      brand: deviceInfo.brand,
      model: deviceInfo.model,
      androidVersion: deviceInfo.androidVersion || processEnv.ANDROID_PLATFORM_VERSION,
      sdkVersion: deviceInfo.sdkVersion,
      webviewVersion: deviceInfo.webviewVersion,
    },
    testData: {
      accountProfile: processEnv.TEST_ACCOUNT_PROFILE || 'TEST_PHONE_A',
      accounts,
      clearDataBeforeRun: bool(processEnv.RESET_APP_CLEAR_DATA_BEFORE_RUN, true),
      destructiveCasesEnabled,
    },
    runner: {
      node: processInfo.node,
      pnpm: toolVersions.pnpm,
      appium: toolVersions.appium,
      webdriverio: toolVersions.webdriverio,
      typescript: toolVersions.typescript,
      platform: String(processInfo.platform),
    },
    env: {
      ANDROID_DEVICE_NAME: processEnv.ANDROID_DEVICE_NAME,
      ANDROID_PLATFORM_VERSION: processEnv.ANDROID_PLATFORM_VERSION,
      ANDROID_APP_PACKAGE: processEnv.ANDROID_APP_PACKAGE,
      ANDROID_APP_ACTIVITY: processEnv.ANDROID_APP_ACTIVITY,
      APPIUM_HOST: processEnv.APPIUM_HOST,
      APPIUM_PORT: processEnv.APPIUM_PORT,
      WEBVIEW_CONTEXT_PATTERN: processEnv.WEBVIEW_CONTEXT_PATTERN,
      TEST_SUITE_NAME: resolveSuiteName(process.argv, processEnv),
    },
  }
}

export function inferFailureType(message: string | undefined): FailureType {
  const text = message || ''
  if (/flaky|偶发|间歇|intermittent|重跑|rerun/i.test(text)) return 'flaky'
  if (/TEST_PHONE|测试账号|账号|前置|缺少|未配置|资料|手机号|account|profile|medical_purge|materials_empty/i.test(text)) return 'data_error'
  if (/LLM|SSE|模型|AI response|OpenAI|third[\s_-]?party|供应商|OCR|微信|backend SSE|(?:Agent|AI).*?(?:模型|SSE|工具调用|tool|response timeout)/i.test(text)) return 'third_party_error'
  if (/Appium|UiAutomator|WebDriver|Chromedriver|ADB|device|emulator|context|WEBVIEW|session|socket|ECONN|network|网络|timeout|timed out|no such context|stale element/i.test(text)) return 'env_error'
  if (/selector|locator|Page Object|data-testid|断言|assert|expect|定位|element.*not found|no such element/i.test(text)) return 'script_error'
  return 'product_bug'
}

export function isBlockingFailure(record: CaseRecordForReporting): boolean {
  if (record.status !== 'failed') return false
  const priority = record.priority?.toUpperCase()
  const tags = record.tags?.map((tag) => tag.toLowerCase()) ?? []
  return priority === 'P0' || tags.includes('p0')
}

export function enrichFailureRecord<T extends CaseRecordForReporting>(record: T): T {
  if (record.status !== 'failed') return record
  const failureType = record.failureType ?? inferFailureType(record.error)
  return {
    ...record,
    failureType,
    failureReason: record.failureReason ?? record.error ?? '',
    isBlocking: record.isBlocking ?? isBlockingFailure(record),
    isFlaky: record.isFlaky ?? failureType === 'flaky',
  }
}

function artifactDirFor(context: RunSummaryContext, caseId: string): string {
  return path.relative(context.runDir, path.join(context.artifactsDir, caseId.replace(/[^A-Za-z0-9_.-]/g, '_')))
}

function passRateFor(records: CaseRecordForReporting[], priority: 'P0' | 'P1'): number | null {
  const matched = records.filter((record) => record.priority?.toUpperCase() === priority || record.tags?.some((tag) => tag.toLowerCase() === priority.toLowerCase()))
  if (matched.length === 0) return null
  return matched.filter((record) => record.status === 'passed').length / matched.length
}

function durationMs(startedAt: string, endedAt: string): number {
  const started = Date.parse(startedAt)
  const ended = Date.parse(endedAt)
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return 0
  return Math.max(0, ended - started)
}

export function buildRunSummary(records: CaseRecordForReporting[], context: RunSummaryContext): RunSummary {
  const allRecords = records.map((record) => enrichFailureRecord(record))
  const total = allRecords.length
  const passed = allRecords.filter((r) => r.status === 'passed').length
  const failed = allRecords.filter((r) => r.status === 'failed').length
  const skipped = allRecords.filter((r) => r.status === 'skipped').length
  const failedRecords = allRecords.filter((r) => r.status === 'failed')
  const skippedRecords = allRecords.filter((r) => r.status === 'skipped')
  const caseDurations = allRecords.map((record) => record.durationMs ?? 0).filter((value) => value > 0)

  return {
    runId: context.runId,
    suite: context.suite,
    startedAt: context.startedAt,
    endedAt: context.endedAt,
    durationMs: durationMs(context.startedAt, context.endedAt),
    total,
    passed,
    failed,
    skipped,
    passRate: total === 0 ? 0 : passed / total,
    avgCaseDurationMs: caseDurations.length === 0 ? 0 : Math.round(caseDurations.reduce((sum, value) => sum + value, 0) / caseDurations.length),
    p0PassRate: passRateFor(allRecords, 'P0'),
    p1PassRate: passRateFor(allRecords, 'P1'),
    blockingDefects: failedRecords.filter((record) => record.isBlocking).length,
    flakyCases: failedRecords.filter((record) => record.isFlaky).length,
    failedCases: failedRecords.map((r) => r.caseId),
    failedCaseDetails: failedRecords.map((r) => ({
      caseId: r.caseId,
      title: r.title,
      reason: r.error || '',
      module: r.module,
      subFunction: r.subFunction,
      priority: r.priority,
      tags: r.tags,
      durationMs: r.durationMs,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      failureType: r.failureType ?? inferFailureType(r.error),
      failureReason: r.failureReason ?? r.error ?? '',
      isBlocking: r.isBlocking ?? isBlockingFailure(r),
      isFlaky: r.isFlaky ?? r.failureType === 'flaky',
      artifactDir: artifactDirFor(context, r.caseId),
    })),
    skippedCases: skippedRecords.map((r) => r.caseId),
    skippedCaseDetails: skippedRecords.map((r) => ({
      caseId: r.caseId,
      title: r.title,
      reason: r.error || '',
      module: r.module,
      subFunction: r.subFunction,
      priority: r.priority,
      tags: r.tags,
      durationMs: r.durationMs,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
    })),
  }
}

function formatPercent(value: number | null): string {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(value === 1 ? 0 : 2)}%`
}

function formatDuration(ms: number): string {
  if (!ms) return '0s'
  const seconds = Math.round(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`
}

function envValue(value: unknown, fallback = '未记录'): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

export function buildQualitySummaryMarkdown(summary: RunSummary, environment?: Partial<EnvironmentSnapshot>): string {
  const gatePassed = summary.blockingDefects === 0
  const conclusion = gatePassed
    ? summary.failed === 0
      ? '本次未发现阻塞失败，核心链路结果可用于继续后续验证。'
      : '本次存在非阻塞失败，需要结合失败归因评估风险。'
    : '本次存在阻塞失败，建议暂缓发布或合并，优先处理阻塞用例。'
  const releaseSuggestion = gatePassed
    ? summary.failed === 0
      ? '可继续执行后续回归或进入下一阶段验证。'
      : '可在确认非阻塞失败影响范围后继续推进。'
    : '建议暂缓发布，先修复阻塞失败或明确风险豁免。'

  const failedSection = summary.failedCaseDetails.length === 0
    ? '本次无失败问题。'
    : summary.failedCaseDetails.map((failure, index) => [
        `${index + 1}. ${failure.caseId} ${failure.title}`,
        `   - 模块：${envValue(failure.module)}`,
        `   - 优先级：${envValue(failure.priority)}`,
        `   - 失败类型：${failure.failureType}`,
        `   - 失败原因：${failure.failureReason || failure.reason || '未记录'}`,
        `   - 是否阻塞：${failure.isBlocking ? '是' : '否'}`,
        `   - 证据目录：${failure.artifactDir}`,
      ].join('\n')).join('\n\n')

  const risks = [
    summary.skipped > 0 ? `- 本次存在 ${summary.skipped} 条 skipped，需要确认是否为前置数据或配置缺失。` : '',
    summary.flakyCases > 0 ? `- 本次存在 ${summary.flakyCases} 条 flaky，需要持续观察。` : '',
    summary.failed > 0 ? '- 本次存在失败用例，请结合 failureType 判断产品、脚本、环境或数据风险。' : '',
    '- 未在本报告中直接证明弱网、多设备矩阵和 iOS 覆盖情况。',
  ].filter(Boolean).join('\n')

  return `# Android WebView 自动化测试报告

## 1. 测试结论

${conclusion}

- Gate: ${gatePassed ? 'Passed' : 'Failed'}
- Reason: ${gatePassed ? '无阻塞失败' : `存在 ${summary.blockingDefects} 个阻塞失败`}

## 2. 执行概况

- Suite: ${summary.suite}
- Run ID: ${summary.runId}
- Total: ${summary.total}
- Passed: ${summary.passed}
- Failed: ${summary.failed}
- Skipped: ${summary.skipped}
- Pass Rate: ${formatPercent(summary.passRate)}
- P0 Pass Rate: ${formatPercent(summary.p0PassRate)}
- P1 Pass Rate: ${formatPercent(summary.p1PassRate)}
- Duration: ${formatDuration(summary.durationMs)}
- Avg Case Duration: ${formatDuration(summary.avgCaseDurationMs)}

## 3. 测试环境

- Device: ${envValue(environment?.device?.manufacturer)} ${envValue(environment?.device?.model)}
- Android: ${envValue(environment?.device?.androidVersion)}
- WebView: ${envValue(environment?.device?.webviewVersion)}
- App: ${envValue(environment?.app?.package)} ${envValue(environment?.app?.versionName, '')}
- Backend: ${envValue(environment?.backend?.env)}

## 4. 失败问题

${failedSection}

## 5. 风险说明

${risks}

## 6. 发布建议

${releaseSuggestion}
`
}

export async function writeQualitySummaryFile(runDir: string, summary: RunSummary, environment?: Partial<EnvironmentSnapshot>): Promise<void> {
  await fs.promises.mkdir(runDir, { recursive: true })
  await fs.promises.writeFile(path.join(runDir, 'quality-summary.md'), buildQualitySummaryMarkdown(summary, environment), 'utf8')
}
