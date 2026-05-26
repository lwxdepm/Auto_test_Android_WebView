import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  buildEnvironmentReport,
  buildQualitySummaryMarkdown,
  buildRunSummary,
  inferFailureType,
  resolveSuiteName,
  writeQualitySummaryFile,
  type CaseRecordForReporting,
} from './reporting.js'



test('resolveSuiteName prefers WDIO --suite argument and normalizes camelCase names', () => {
  assert.equal(resolveSuiteName(['node', 'wdio', 'run', 'wdio.android.conf.ts', '--suite', 'smokeCore'], { TEST_SUITE_NAME: 'webview-p0-fast' }), 'smoke-core')
  assert.equal(resolveSuiteName(['node', 'wdio', 'run', 'wdio.android.conf.ts', '--suite=legacy'], { TEST_SUITE_NAME: 'webview-p0-fast' }), 'legacy')
  assert.equal(resolveSuiteName(['node', 'wdio', 'run', 'wdio.android.conf.ts', '--suite', 'bridgeSlow']), 'bridge-slow')
  assert.equal(resolveSuiteName(['node', 'wdio', 'run', 'wdio.android.conf.ts'], { TEST_SUITE_NAME: 'manual-suite' }), 'manual-suite')
  assert.equal(resolveSuiteName(['node', 'wdio', 'run', 'wdio.android.conf.ts'], {}), 'all')
})

test('buildEnvironmentReport creates structured environment without leaking full phone numbers', () => {
  const snapshot = buildEnvironmentReport({
    runId: '2026-05-14_12-00-00',
    startedAt: '2026-05-14T04:00:00.000Z',
    projectRoot: '/repo/Auto_test_Android_WebView',
    processEnv: {
      ANDROID_DEVICE_NAME: '10AE1Q1ZN8002EU',
      ANDROID_PLATFORM_VERSION: '14',
      ANDROID_APP_PACKAGE: 'com.cx.agent',
      ANDROID_APP_ACTIVITY: 'com.cx.agent.MainActivity',
      APPIUM_HOST: '127.0.0.1',
      APPIUM_PORT: '4723',
      WEBVIEW_CONTEXT_PATTERN: 'WEBVIEW',
      TEST_SUITE_NAME: 'smoke-core',
      APP_VERSION_NAME: '1.0.3',
      APP_VERSION_CODE: '103',
      APP_BUILD_TYPE: 'test',
      H5_BASE_URL: 'https://test.example.com',
      H5_COMMIT: 'a1b2c3d',
      H5_BUILD_TIME: '2026-05-14T09:00:00+08:00',
      BACKEND_ENV: 'test',
      API_BASE_URL: 'https://api-test.example.com',
      TEST_PHONE_A: '13300000000',
      TEST_PHONE_MEDICAL_DOC: '13300000002',
      TEST_PHONE_BUSINESS_AUTO_INCREMENT: 'true',
      TEST_PHONE_MEDICAL_PURGE_AUTO_INCREMENT: 'true',
      RESET_APP_CLEAR_DATA_BEFORE_RUN: 'true',
    },
    processInfo: {
      node: 'v20.20.2',
      platform: 'darwin',
      arch: 'arm64',
    },
    toolVersions: {
      pnpm: '10.0.0',
      appium: '3.4.0',
      webdriverio: '9.0.0',
      typescript: '5.7.2',
    },
    deviceInfo: {
      manufacturer: 'Xiaomi',
      model: 'Mi 12',
      androidVersion: '14',
      webviewVersion: 'com.google.android.webview 124.0.0',
    },
  })

  assert.equal(snapshot.app.package, 'com.cx.agent')
  assert.equal(snapshot.app.versionName, '1.0.3')
  assert.equal(snapshot.h5.commit, 'a1b2c3d')
  assert.equal(snapshot.backend.env, 'test')
  assert.equal(snapshot.device.manufacturer, 'Xiaomi')
  assert.equal(snapshot.runner.webdriverio, '9.0.0')
  assert.equal(snapshot.testData.accounts.TEST_PHONE_A, '133****0000')
  assert.equal(snapshot.testData.accounts.TEST_PHONE_MEDICAL_DOC, '133****0002')
  assert.equal(snapshot.testData.accounts.TEST_PHONE_BUSINESS, 'dynamic')
  assert.equal(snapshot.testData.accounts.TEST_PHONE_MATERIALS_FULL, 'not_configured')
  assert.equal(snapshot.testData.clearDataBeforeRun, true)
  assert.equal(snapshot.testData.destructiveCasesEnabled, true)
  assert.equal(snapshot.env.TEST_SUITE_NAME, 'smoke-core')
})

test('inferFailureType classifies common Android WebView automation failures', () => {
  assert.equal(
    inferFailureType('Chat 页面未加载完成。请确认 TEST_PHONE_A 是已完成资料的 active 账号。'),
    'data_error',
  )
  assert.equal(
    inferFailureType('No such context WEBVIEW_com.cx.agent, Chromedriver session timeout'),
    'env_error',
  )
  assert.equal(
    inferFailureType('AI response timeout, backend SSE unstable'),
    'third_party_error',
  )
  assert.equal(
    inferFailureType('selector [data-testid=send] not found in Page Object'),
    'script_error',
  )
  assert.equal(
    inferFailureType('点击发送后页面出现真实业务错误提示'),
    'product_bug',
  )
})

test('buildRunSummary adds failureType fields and quality summary renders human readable markdown', () => {
  const records: CaseRecordForReporting[] = [
    {
      caseId: 'CX-WV-BASE-001',
      title: 'WebView 可切入',
      priority: 'P0',
      status: 'passed',
      startedAt: '2026-05-14T04:00:00.000Z',
      endedAt: '2026-05-14T04:00:05.000Z',
      durationMs: 5000,
      tags: ['android', 'smoke-core', 'p0'],
    },
    {
      caseId: 'CX-WV-BASE-002',
      title: '固定验证码账号可登录进入 Chat',
      priority: 'P0',
      status: 'failed',
      error: 'No such context WEBVIEW_com.cx.agent, Chromedriver session timeout',
      startedAt: '2026-05-14T04:00:05.000Z',
      endedAt: '2026-05-14T04:00:35.000Z',
      durationMs: 30000,
      tags: ['android', 'smoke-core', 'login', 'p0'],
    },
    {
      caseId: 'CX-MAT-001',
      title: '材料页前置数据缺失',
      priority: 'P1',
      status: 'skipped',
      error: '缺少材料前置数据',
      startedAt: '2026-05-14T04:00:35.000Z',
      endedAt: '2026-05-14T04:00:35.100Z',
      durationMs: 100,
      tags: ['android', 'smoke-core', 'materials', 'p1'],
    },
  ]

  const summary = buildRunSummary(records, {
    runId: '2026-05-14_12-00-00',
    suite: 'smoke-core',
    startedAt: '2026-05-14T04:00:00.000Z',
    endedAt: '2026-05-14T04:00:36.000Z',
    runDir: '/repo/reports/runs/2026-05-14_12-00-00',
    artifactsDir: '/repo/reports/runs/2026-05-14_12-00-00/artifacts',
  })

  assert.equal(summary.total, 3)
  assert.equal(summary.passed, 1)
  assert.equal(summary.failed, 1)
  assert.equal(summary.skipped, 1)
  assert.equal(summary.passRate, 1 / 3)
  assert.equal(summary.p0PassRate, 1 / 2)
  assert.equal(summary.blockingDefects, 1)
  assert.equal(summary.failedCaseDetails[0].failureType, 'env_error')
  assert.equal(summary.failedCaseDetails[0].isBlocking, true)
  assert.equal(summary.failedCaseDetails[0].artifactDir, 'artifacts/CX-WV-BASE-002')

  const markdown = buildQualitySummaryMarkdown(summary, {
    device: { model: 'Mi 12', androidVersion: '14', webviewVersion: '124.x' },
    app: { package: 'com.cx.agent', versionName: '1.0.3' },
    backend: { env: 'test' },
  })

  assert.match(markdown, /^# Android WebView 自动化测试报告/m)
  assert.match(markdown, /## 1\. 测试结论/)
  assert.match(markdown, /Gate: Failed/)
  assert.match(markdown, /CX-WV-BASE-002/)
  assert.match(markdown, /失败类型：env_error/)
  assert.match(markdown, /建议暂缓发布/)
})

test('writeQualitySummaryFile creates quality-summary.md in the run directory', async () => {
  const runDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-summary-'))
  const summary = buildRunSummary([], {
    runId: '2026-05-14_12-30-00',
    suite: 'smoke-core',
    startedAt: '2026-05-14T04:30:00.000Z',
    endedAt: '2026-05-14T04:30:01.000Z',
    runDir,
    artifactsDir: path.join(runDir, 'artifacts'),
  })

  await writeQualitySummaryFile(runDir, summary, {
    device: { model: 'Mi 12', androidVersion: '14' },
    app: { package: 'com.cx.agent' },
    backend: { env: 'test' },
  })

  const markdown = await fs.readFile(path.join(runDir, 'quality-summary.md'), 'utf8')
  assert.match(markdown, /# Android WebView 自动化测试报告/)
  assert.match(markdown, /Suite: smoke-core/)
})
