import type { Options } from '@wdio/types'
import { env } from './src/config/env.js'
import { ensureRunContext } from './src/core/run-context.js'
import { performPreRunReset } from './src/core/pre-run-reset.js'

const run = ensureRunContext()

const appiumService = env.startAppium
  ? [[
      'appium',
      {
        command: 'appium',
        args: {
          address: env.appiumHost,
          port: env.appiumPort,
          relaxedSecurity: true,
        },
      },
    ]]
  : []

const capabilities: WebdriverIO.Capabilities[] = [
  {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': env.androidDeviceName,
    ...(env.androidPlatformVersion ? { 'appium:platformVersion': env.androidPlatformVersion } : {}),
    'appium:appPackage': env.androidAppPackage,
    'appium:appActivity': env.androidAppActivity,
    'appium:autoWebview': false,
    'appium:autoGrantPermissions': env.androidAutoGrantPermissions,
    'appium:disableWindowAnimation': env.androidDisableWindowAnimation,
    'appium:skipLogcatCapture': env.appiumSkipLogcatCapture,
    'appium:noReset': env.androidNoReset,
    'appium:dontStopAppOnReset': env.androidDontStopAppOnReset,
    'appium:fullReset': env.androidFullReset,
    'appium:newCommandTimeout': env.androidNewCommandTimeoutSeconds,
    'appium:chromedriverArgs': ['--disable-logging'],
    'appium:uiautomator2ServerReadTimeout': env.uiautomator2ServerReadTimeoutMs,
    ...(env.chromedriverExecutableDir
      ? { 'appium:chromedriverExecutableDir': env.chromedriverExecutableDir }
      : {}),
  },
]

export const config = {
  runner: 'local',
  framework: 'mocha',
  hostname: env.appiumHost,
  port: env.appiumPort,
  path: '/',
  maxInstances: 1,
  specs: ['./src/specs/**/*.spec.ts'],
  suites: {
    smoke: [
      './src/specs/01-webview-start.spec.ts',
      './src/specs/02-login-basic.spec.ts',
      './src/specs/03-auth-state.spec.ts',
      './src/specs/04-deeplink.spec.ts',
      './src/specs/05-webview-container-fast.spec.ts',
      './src/specs/06-navigation-reading.spec.ts',
      './src/specs/07-chat-input-fast.spec.ts',
    ],
    login: ['./src/specs/02-login-basic.spec.ts'],
    authState: ['./src/specs/03-auth-state.spec.ts', './src/specs/04-deeplink.spec.ts'],
    webview: ['./src/specs/01-webview-start.spec.ts', './src/specs/05-webview-container-fast.spec.ts'],
    navigation: ['./src/specs/06-navigation-reading.spec.ts'],
    reading: ['./src/specs/06-navigation-reading.spec.ts'],
    chatFast: ['./src/specs/07-chat-input-fast.spec.ts'],
    profileFast: ['./src/specs/08-profile-account-fast.spec.ts'],
    accountFast: ['./src/specs/08-profile-account-fast.spec.ts'],
    materialsFast: ['./src/specs/09-materials-medical-fast.spec.ts'],
    medicalFast: ['./src/specs/09-materials-medical-fast.spec.ts'],
    extendedFast: [
      './src/specs/06-navigation-reading.spec.ts',
      './src/specs/07-chat-input-fast.spec.ts',
      './src/specs/08-profile-account-fast.spec.ts',
      './src/specs/09-materials-medical-fast.spec.ts',
    ],
    legacy: [
      './src/specs/01-webview-start.spec.ts',
      './src/specs/02-login-basic.spec.ts',
      './src/specs/03-auth-state.spec.ts',
      './src/specs/04-deeplink.spec.ts',
      './src/specs/05-webview-container-fast.spec.ts',
      './src/specs/06-navigation-reading.spec.ts',
      './src/specs/07-chat-input-fast.spec.ts',
      './src/specs/08-profile-account-fast.spec.ts',
      './src/specs/09-materials-medical-fast.spec.ts',
    ],
    bridge: ['./src/specs/10-bridge-native.spec.ts'],
    bridgeSlow: ['./src/specs/11-bridge-native-slow.spec.ts'],
  },
  capabilities,
  services: appiumService as Options.Testrunner['services'],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: env.webdriverConnectionRetryTimeoutMs,
  connectionRetryCount: 1,
  reporters: [
    'spec',
    ['junit', {
      outputDir: `${run.runDir}/junit`,
      outputFileFormat: (options: { cid: string }) => `wdio-${options.cid}.xml`,
    }],
    ['allure', {
      outputDir: `${run.runDir}/allure-results`,
      disableWebdriverStepsReporting: true,
      disableWebdriverScreenshotsReporting: false,
    }],
  ],
  mochaOpts: {
    ui: 'bdd',
    // 部分健康档案/账号切换用例需要准备远端测试数据，120s 容易被 Mocha 先行判为 Timeout，
    // 导致 finally 恢复逻辑和自定义 summary 与 JUnit/Allure 不一致。
    timeout: 240000,
  },
  /**
   * teardown 前主动切回 NATIVE_APP，并尽量提前清理 app。
   * 这样可以减少 WebdriverIO 最后 deleteSession 时等待 Chromedriver/WebView cleanup 的时间。
   */
  after: async () => {
    try {
      const { browser } = await import('@wdio/globals')
      const current = String(await (browser as any).getContext().catch(() => ''))
      if (current && current !== 'NATIVE_APP') {
        await (browser as any).switchContext('NATIVE_APP')
      }
      if (env.fastTeardown && env.postRunForceStopApp && env.androidAppPackage) {
        await (browser as any).execute('mobile: shell', {
          command: 'am',
          args: ['force-stop', env.androidAppPackage],
          includeStderr: true,
          timeout: 5000,
        }).catch(() => undefined)
      } else if (!env.fastTeardown) {
        await browser.pause(300)
      }
    } catch (err) {
      console.warn(`after hook: fast teardown skipped: ${err instanceof Error ? err.message : String(err)}`)
    }
  },
  async onPrepare() {
    ensureRunContext()
    await performPreRunReset()
  },
} as Options.Testrunner
