# Android 自动化测试迁移 iOS 技术方案与路线

> 项目：Androd_Auto_Test  
> 当前技术栈：Appium + UiAutomator2 + WebdriverIO + TypeScript + Mocha  
> 目标：在保留现有 Android 自动化能力的基础上，新增 iOS 自动化测试能力  
> 生成日期：2026-05-07

---

## 1. 背景与目标

当前项目已经实现了一套基于 Android WebView 的自动化测试脚本，主要用于验证 App 中 H5/WebView 相关功能，包括：

- WebView 启动与 Context 检测
- 登录与验证码流程
- 登录态、登出、深链跳转
- Chat 页面与输入框
- 侧边栏导航
- 阅读设置
- 个人信息与账号安全
- 材料、健康档案、OCR 入口等

当前 Android 侧使用：

```text
Appium + UiAutomator2 + WebdriverIO + TypeScript + Mocha
```

迁移目标不是重写一套 iOS 自动化，而是将当前项目升级为：

```text
Android + iOS 双平台 Appium 自动化项目
```

推荐最终结构：

```text
Android:
  wdio.android.conf.ts
  UiAutomator2
  AndroidDeviceController

IOS:
  wdio.ios.conf.ts
  XCUITest
  IOSDeviceController

共用:
  specs
  flows
  pages
  H5Runtime
  CaseRunner
  报告体系
  测试账号与测试数据逻辑
```

---

## 2. 当前项目现状评估

### 2.1 当前自动化规模

经项目结构检查，当前 `src/specs` 下共实现约 **163 个 `itCase`**，分布如下：

| Spec 文件 | 用例数量 | 主要内容 |
|---|---:|---|
| `01-webview-start.spec.ts` | 1 | WebView 启动检测 |
| `02-login-basic.spec.ts` | 9 | 登录、验证码、协议弹窗 |
| `03-auth-state.spec.ts` | 5 | 登录态、登出、清数据 |
| `04-deeplink.spec.ts` | 1 | 未登录深链重定向 |
| `05-webview-container-fast.spec.ts` | 4 | WebView 容器兼容性 |
| `06-navigation-reading.spec.ts` | 19 | 侧边栏导航、阅读设置 |
| `07-chat-input-fast.spec.ts` | 37 | Chat、输入框、消息发送 |
| `08-profile-account-fast.spec.ts` | 28 | 个人信息、账号安全 |
| `09-materials-medical-fast.spec.ts` | 59 | 材料、健康档案、OCR 入口 |

---

### 2.2 当前可复用部分

当前项目中，以下内容迁移到 iOS 后复用价值较高：

```text
src/specs/
src/flows/
src/pages/
src/core/h5-runtime.ts
src/core/case-runner.ts
src/core/run-context.ts
src/core/selectors.ts
src/config/accounts.ts
src/config/case-manifest.ts
```

原因是当前大量操作集中在 WebView/H5 层，例如：

```ts
window.location
localStorage
fetch
CSS selector
XPath
DOM text
textarea/input/button
```

只要 iOS App 的 WebView context 能被 Appium 识别，并成功切换到 WebView，很多 H5 层用例可以继续复用。

---

### 2.3 当前 Android 强绑定部分

以下内容强依赖 Android，需要重构或拆分平台实现：

```text
wdio.android.conf.ts
src/config/env.ts
src/core/app-controller.ts
src/core/pre-run-reset.ts
src/core/artifacts.ts
src/scripts/doctor.ts
package.json scripts
```

当前 Android 强绑定能力包括：

```text
ADB
UiAutomator2
ANDROID_DEVICE_NAME
ANDROID_PLATFORM_VERSION
ANDROID_APP_PACKAGE
ANDROID_APP_ACTIVITY
mobile: shell
am force-stop
am start
pm clear
logcat
adb forward --remove-all
```

这些能力在 iOS 上不能直接使用，需要引入 XCUITest、WebDriverAgent、xcrun simctl 或 iOS 专用 Appium 能力。

---

## 3. 总体迁移结论

### 3.1 是否可以迁移？

可以迁移。

并且由于当前项目主要测试 WebView/H5，迁移价值较高，不建议重写。

推荐采用：

```text
保留现有 Android 自动化
新增 iOS 配置与平台适配层
共用业务用例、页面对象和 H5 操作能力
```

---

### 3.2 迁移难度评估

| 模块 | 迁移难度 | 说明 |
|---|---:|---|
| H5 登录、路由、localStorage、接口验证 | 低 | 大量逻辑可复用 |
| Chat、Profile、Materials 普通页面 | 中 | 主要处理 iOS WebView、键盘、滚动差异 |
| App 启动、重启、清数据、日志采集 | 高 | 当前强依赖 Android ADB 和 mobile shell |
| iOS 模拟器运行 | 中 | 需要 Mac、Xcode、XCUITest driver、iOS `.app` 包 |
| iOS 真机运行 | 高 | 需要 WebDriverAgent 签名、Provisioning Profile、设备信任 |
| 图片上传、OCR、相册/相机相关用例 | 高 | iOS 权限弹窗、系统相册、文件上传机制不同 |

---

### 3.3 预估工期

| 阶段 | 预估时间 | 目标 |
|---|---:|---|
| Phase 0 | 0.5～1 天 | 准备 Mac、Xcode、iOS 包、环境 |
| Phase 1 | 1～3 天 | iOS 模拟器 POC，跑通 WebView + 登录 |
| Phase 2 | 2～4 天 | 增加 iOS 配置、平台抽象、脚本命令 |
| Phase 3 | 3～5 天 | 迁移 smoke 核心用例 |
| Phase 4 | 1～2 周 | 迁移大部分 H5 用例 |
| Phase 5 | 3～7 天 | iOS 真机适配和稳定性优化 |

整体预估：

```text
模拟器核心用例跑通：3～7 天
完整 H5 主流程迁移：1～2 周
真机稳定运行：再加 1～2 周
```

---

## 4. iOS 自动化基础方案

### 4.1 iOS 推荐技术栈

继续沿用当前 WebdriverIO 体系，新增 iOS Appium driver：

```text
Appium
WebdriverIO
TypeScript
Mocha
XCUITest Driver
WebDriverAgent
```

Android 使用：

```text
platformName: Android
automationName: UiAutomator2
```

iOS 使用：

```text
platformName: iOS
automationName: XCUITest
```

---

### 4.2 需要的硬件与软件

#### 必需

```text
Mac 电脑
Xcode
iOS Simulator
Node.js >= 20
pnpm
Appium
XCUITest driver
iOS 测试包
```

#### 真机阶段额外需要

```text
iPhone 真机
Apple Developer 账号或企业签名能力
Provisioning Profile
WebDriverAgent 签名配置
设备 UDID
Developer Mode
设备信任
Safari Web Inspector
```

---

### 4.3 iOS App 包要求

#### 模拟器

需要 iOS 开发提供：

```text
xxx.app
```

通常路径类似：

```text
/Users/xxx/Library/Developer/Xcode/DerivedData/.../Build/Products/Debug-iphonesimulator/xxx.app
```

#### 真机

需要提供：

```text
xxx.ipa
Bundle ID
UDID 白名单或企业签名
```

---

### 4.4 iOS WebView 要求

当前项目高度依赖 WebView context，因此 iOS App 必须保证 WKWebView 可调试。

iOS 端建议由开发同学在测试包中加入：

```swift
#if DEBUG
if #available(iOS 16.4, *) {
    webView.isInspectable = true
}
#endif
```

真机上还需要检查：

```text
设置 -> Safari -> 高级 -> Web 检查器
```

否则可能出现：

```text
App 能启动
但是 Appium getContexts 只有 NATIVE_APP
找不到 WEBVIEW_xxx
```

---

## 5. 推荐项目改造方案

### 5.1 新增平台变量

当前 `.env` 只有 Android 字段，建议新增：

```env
TEST_PLATFORM=android
```

或 iOS：

```env
TEST_PLATFORM=ios
```

后续所有平台差异通过该变量分流。

---

### 5.2 新增 iOS 环境配置

建议新增 `.env.ios.example`：

```env
# ------------------------------------------------------------
# 1. 平台
# ------------------------------------------------------------
TEST_PLATFORM=ios

# ------------------------------------------------------------
# 2. Appium
# ------------------------------------------------------------
APPIUM_HOST=127.0.0.1
APPIUM_PORT=4723
START_APPIUM=false

# ------------------------------------------------------------
# 3. iOS 模拟器配置
# ------------------------------------------------------------
IOS_DEVICE_NAME=iPhone 15
IOS_PLATFORM_VERSION=17.5
IOS_APP=/Users/yourname/path/to/CxAgent.app
IOS_BUNDLE_ID=com.cx.agent

# ------------------------------------------------------------
# 4. iOS 真机配置
# ------------------------------------------------------------
IOS_UDID=
IOS_XCODE_ORG_ID=
IOS_XCODE_SIGNING_ID=Apple Development
IOS_UPDATED_WDA_BUNDLE_ID=com.yourcompany.WebDriverAgentRunner

# ------------------------------------------------------------
# 5. WebView
# ------------------------------------------------------------
WEBVIEW_CONTEXT_PATTERN=WEBVIEW
WEBVIEW_CONTEXT_TIMEOUT_MS=60000

# ------------------------------------------------------------
# 6. iOS 行为
# ------------------------------------------------------------
IOS_NO_RESET=true
IOS_FULL_RESET=false
IOS_NEW_COMMAND_TIMEOUT_SECONDS=180

# ------------------------------------------------------------
# 7. 测试账号
# ------------------------------------------------------------
SMS_FIXED_CODE=123
TEST_PHONE_A=13300000000
TEST_PHONE_B=13300000002
TEST_PHONE_PENDING=13300000003
```

---

### 5.3 改造 `src/config/env.ts`

当前配置集中在 Android 字段，例如：

```ts
androidDeviceName
androidPlatformVersion
androidAppPackage
androidAppActivity
```

建议新增 iOS 字段：

```ts
platform: str('TEST_PLATFORM', 'android'),

// iOS
iosDeviceName: str('IOS_DEVICE_NAME', ''),
iosPlatformVersion: str('IOS_PLATFORM_VERSION', ''),
iosUdid: str('IOS_UDID', ''),
iosApp: str('IOS_APP', ''),
iosBundleId: str('IOS_BUNDLE_ID', ''),
iosNoReset: bool('IOS_NO_RESET', true),
iosFullReset: bool('IOS_FULL_RESET', false),
iosNewCommandTimeoutSeconds: num('IOS_NEW_COMMAND_TIMEOUT_SECONDS', 180),
iosXcodeOrgId: str('IOS_XCODE_ORG_ID', ''),
iosXcodeSigningId: str('IOS_XCODE_SIGNING_ID', 'Apple Development'),
iosUpdatedWdaBundleId: str('IOS_UPDATED_WDA_BUNDLE_ID', ''),
```

并增加校验逻辑：

```ts
if (env.platform === 'android') {
  require ANDROID_APP_PACKAGE
  require ANDROID_APP_ACTIVITY
}

if (env.platform === 'ios') {
  require IOS_BUNDLE_ID
  require IOS_APP or IOS_UDID
}
```

---

### 5.4 新增 `wdio.ios.conf.ts`

新增文件：

```text
wdio.ios.conf.ts
```

核心 capabilities 示例：

```ts
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
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': env.iosDeviceName,
    ...(env.iosPlatformVersion ? { 'appium:platformVersion': env.iosPlatformVersion } : {}),
    ...(env.iosUdid ? { 'appium:udid': env.iosUdid } : {}),
    ...(env.iosApp
      ? { 'appium:app': env.iosApp }
      : { 'appium:bundleId': env.iosBundleId }),
    'appium:autoWebview': false,
    'appium:noReset': env.iosNoReset,
    'appium:fullReset': env.iosFullReset,
    'appium:newCommandTimeout': env.iosNewCommandTimeoutSeconds,
    ...(env.iosXcodeOrgId ? { 'appium:xcodeOrgId': env.iosXcodeOrgId } : {}),
    ...(env.iosXcodeSigningId ? { 'appium:xcodeSigningId': env.iosXcodeSigningId } : {}),
    ...(env.iosUpdatedWdaBundleId ? { 'appium:updatedWDABundleId': env.iosUpdatedWdaBundleId } : {}),
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
    webview: ['./src/specs/01-webview-start.spec.ts', './src/specs/05-webview-container-fast.spec.ts'],
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
    timeout: 120000,
  },
  async onPrepare() {
    ensureRunContext()
    await performPreRunReset()
  },
} as Options.Testrunner
```

---

## 6. 平台抽象设计

### 6.1 新增平台判断

新增：

```text
src/core/platform.ts
```

示例：

```ts
import { env } from '../config/env.js'

export type TestPlatform = 'android' | 'ios'

export function getPlatform(): TestPlatform {
  return env.platform === 'ios' ? 'ios' : 'android'
}

export function isAndroid(): boolean {
  return getPlatform() === 'android'
}

export function isIOS(): boolean {
  return getPlatform() === 'ios'
}
```

---

### 6.2 设计统一设备控制接口

新增：

```text
src/core/device-controller.ts
```

```ts
export interface DeviceController {
  launch(): Promise<void>
  terminate(): Promise<void>
  restart(): Promise<void>
  clearAppData(): Promise<void>
  getDeviceInfo(): Promise<Record<string, unknown>>
  collectDeviceLog(lines?: number): Promise<string>
}
```

---

### 6.3 Android 实现

新增或迁移：

```text
src/core/android-device-controller.ts
```

Android 继续使用当前逻辑：

```text
browser.activateApp(ANDROID_APP_PACKAGE)
browser.terminateApp(ANDROID_APP_PACKAGE)
mobile: shell am force-stop
mobile: shell am start
mobile: shell pm clear
mobile: shell logcat
```

---

### 6.4 iOS 实现

新增：

```text
src/core/ios-device-controller.ts
```

iOS 示例：

```ts
import { browser } from '@wdio/globals'
import { env } from '../config/env.js'
import { WebViewContext } from './webview-context.js'

export class IOSDeviceController {
  async launch(): Promise<void> {
    if (env.iosBundleId) {
      await (browser as any).activateApp(env.iosBundleId)
    }
  }

  async terminate(): Promise<void> {
    if (env.iosBundleId) {
      await (browser as any).terminateApp(env.iosBundleId)
    }
  }

  async restart(): Promise<void> {
    await WebViewContext.switchToNative().catch(() => undefined)
    await this.terminate().catch(() => undefined)
    await browser.pause(1500)
    await this.launch()
    await WebViewContext.switchToWebView()
  }

  async clearAppData(): Promise<void> {
    // iOS 没有 Android pm clear 的直接等价方案。
    // 模拟器可通过 uninstall/install 或 Appium reset 能力处理。
    // 真机建议通过卸载重装或测试专用清理接口处理。
    throw new Error('iOS clearAppData 暂不支持直接清理，请使用 fullReset、重装 App 或 H5 清理逻辑')
  }

  async getDeviceInfo(): Promise<Record<string, unknown>> {
    return {
      platform: 'ios',
      deviceName: env.iosDeviceName,
      platformVersion: env.iosPlatformVersion,
      udid: env.iosUdid,
      bundleId: env.iosBundleId,
    }
  }

  async collectDeviceLog(): Promise<string> {
    return 'iOS device log collection is not implemented yet.'
  }
}
```

---

### 6.5 改造 `AppController`

当前 `AppController` 内部直接依赖 Android 包名和 ADB shell，建议改为平台代理：

```ts
import { getPlatform } from './platform.js'
import { AndroidDeviceController } from './android-device-controller.js'
import { IOSDeviceController } from './ios-device-controller.js'

const controller = getPlatform() === 'ios'
  ? new IOSDeviceController()
  : new AndroidDeviceController()

export class AppController {
  static launch() {
    return controller.launch()
  }

  static terminate() {
    return controller.terminate()
  }

  static restart() {
    return controller.restart()
  }

  static clearAppData() {
    return controller.clearAppData()
  }

  static getDeviceInfo() {
    return controller.getDeviceInfo()
  }

  static collectLogcat(lines = 400) {
    return controller.collectDeviceLog(lines)
  }
}
```

这样现有 flows 基本不用改。

---

## 7. WebView Context 适配策略

### 7.1 当前问题

当前实现：

```ts
const webview = contexts.find((ctx) => ctx.includes(pattern))
```

在 Android 单 WebView 场景下通常够用，但 iOS 可能存在：

```text
NATIVE_APP
WEBVIEW_1
WEBVIEW_2
WEBVIEW_com.xxx.xxx
```

如果选错 WebView，可能导致：

```text
能切换 context，但 location.href 不是目标页面
DOM 查询失败
页面为空
```

---

### 7.2 建议增强选择逻辑

推荐在 `WebViewContext` 中增加“按 URL/页面特征选择 WebView”的能力：

```ts
static async switchToTargetWebView(timeoutMs = env.webviewContextTimeoutMs): Promise<string> {
  let latest: string[] = []

  await browser.waitUntil(async () => {
    latest = (await (browser as any).getContexts()).map(String)
    return latest.some((ctx) => ctx.includes(env.webviewContextPattern))
  }, {
    timeout: timeoutMs,
    interval: 500,
    timeoutMsg: `未找到 WebView Context: ${JSON.stringify(latest)}`,
  })

  const contexts = (await (browser as any).getContexts()).map(String)
  const webviews = contexts.filter((ctx) => ctx.includes(env.webviewContextPattern))

  for (const ctx of webviews) {
    try {
      await (browser as any).switchContext(ctx)
      const href = await browser.execute(() => window.location.href).catch(() => '')
      const body = await browser.execute(() => document.body?.innerText || '').catch(() => '')

      if (
        String(href).includes('/login') ||
        String(href).includes('/chat') ||
        String(body).includes('橙欣健康') ||
        String(body).includes('请输入手机号')
      ) {
        return ctx
      }
    } catch {
      // try next context
    }
  }

  const fallback = webviews[0]
  if (!fallback) throw new Error(`未找到可用 WebView: ${JSON.stringify(contexts)}`)
  await (browser as any).switchContext(fallback)
  return fallback
}
```

---

## 8. pre-run reset 改造方案

### 8.1 Android 当前行为

当前 Android 运行前会：

```text
adb get-state
adb shell ps -A
adb forward --remove-all
adb shell am force-stop <package>
adb shell pm clear <package>
adb shell am force-stop <package>
adb shell ps -A
```

这是 Android 专用逻辑。

---

### 8.2 iOS 模拟器 reset 方案

iOS 模拟器推荐两种方案。

#### 方案 A：依赖 Appium fullReset

```env
IOS_NO_RESET=false
IOS_FULL_RESET=true
```

优点：配置简单。  
缺点：每次安装较慢。

#### 方案 B：使用 `xcrun simctl`

```bash
xcrun simctl terminate booted com.cx.agent
xcrun simctl uninstall booted com.cx.agent
xcrun simctl install booted /path/to/CxAgent.app
```

优点：行为可控。  
缺点：需要写 iOS 专用 reset 脚本。

---

### 8.3 iOS 真机 reset 方案

iOS 真机没有 Android `pm clear` 的稳定等价能力。

推荐顺序：

1. 优先通过卸载/重装 App 达到干净状态；
2. 如果无法频繁重装，增加测试包专用清理接口；
3. H5 层至少清理：

```ts
localStorage.clear()
sessionStorage.clear()
indexedDB 清理，如有必要
```

4. 后端测试数据通过测试 API 重置。

---

## 9. iOS 真机适配重点

iOS 真机是迁移中的主要风险点。

需要重点处理：

```text
WebDriverAgent 签名
xcodeOrgId
xcodeSigningId
updatedWDABundleId
Provisioning Profile
设备 UDID
Developer Mode
信任开发者证书
Safari Web Inspector
App 包签名
```

建议不要一开始就做真机。推荐顺序：

```text
iOS 模拟器跑通 smoke
再接 iOS 真机
再做真机稳定性和权限弹窗
```

---

## 10. package.json 脚本改造建议

当前脚本偏 Windows：

```json
"appium": "set APPIUM_HOME=%CD%\\.appium&& appium --address 127.0.0.1 --port 4723 --relaxed-security"
```

Mac 上不能直接使用 `set APPIUM_HOME=%CD%`。

### 10.1 简单方案：新增 macOS/iOS 脚本

```json
{
  "scripts": {
    "appium:install:ios-driver": "APPIUM_HOME=$PWD/.appium appium driver install xcuitest",
    "appium:ios": "APPIUM_HOME=$PWD/.appium appium --address 127.0.0.1 --port 4723 --relaxed-security",
    "test:ios:smoke": "wdio run wdio.ios.conf.ts --suite smoke",
    "test:ios:login": "wdio run wdio.ios.conf.ts --suite login",
    "test:ios:webview": "wdio run wdio.ios.conf.ts --suite webview",
    "test:ios:all": "wdio run wdio.ios.conf.ts"
  }
}
```

### 10.2 更长期方案：引入 cross-env

如果希望 Windows 和 Mac 共用脚本，可以引入：

```text
cross-env
```

示例：

```json
"appium": "cross-env APPIUM_HOME=.appium appium --address 127.0.0.1 --port 4723 --relaxed-security"
```

---

## 11. iOS POC 验证用例建议

第一阶段不要直接跑全部 163 个用例。

建议按顺序验证：

### 11.1 WebView 启动

```text
CX-WV-BASE-001 App 启动 WebView，可获取 URL 和页面文本
```

验证点：

```text
Appium session 创建成功
App 能启动
getContexts 有 WEBVIEW_xxx
能 switchContext
能读取 window.location.href
能读取 document.body.innerText
```

---

### 11.2 登录基础流程

```text
CX-WV-BASE-004 无效手机号前端提示
CX-WV-BASE-005 重复获取验证码按钮倒计时
CX-WV-BASE-006 协议未勾选禁止登录
CX-WV-BASE-002 正确验证码登录成功
```

验证点：

```text
input 可输入
button 可点击
localStorage 可读写
登录后路由跳转正确
```

---

### 11.3 Chat 页面

```text
Chat 页面加载
输入框聚焦
软键盘不遮挡输入框
发送消息
停止生成
复制/反馈/分享按钮
```

重点关注：

```text
iOS 键盘高度
iOS visualViewport 行为
textarea click/setValue 差异
滚动容器差异
```

---

## 12. 风险清单与应对方案

### 12.1 找不到 WebView context

表现：

```text
getContexts 只有 NATIVE_APP
```

可能原因：

```text
WKWebView 未开启 inspectable
iOS 真机未开启 Safari Web Inspector
App 是 release 包，禁用了调试
WebView 尚未加载完成
Appium/Xcode/iOS 版本不兼容
```

应对：

```text
使用 Debug/Test 包
开启 WKWebView.isInspectable
iOS 真机打开 Safari Web Inspector
WEBVIEW_CONTEXT_TIMEOUT_MS 提高到 60000
先用模拟器验证
```

---

### 12.2 iOS 键盘遮挡导致用例失败

表现：

```text
输入框点击后不可见
按钮被键盘遮挡
element click intercepted
```

应对：

```text
优先用 H5Runtime.execute 操作 DOM
使用 visualViewport 判断
必要时切 NATIVE_APP hideKeyboard
避免依赖固定坐标
```

---

### 12.3 清数据能力不一致

Android 当前用：

```text
pm clear
```

iOS 没有完全等价能力。

应对：

```text
模拟器使用 fullReset 或 uninstall/install
真机使用卸载重装
H5 层清 localStorage/sessionStorage
后端测试数据走 API reset
```

---

### 12.4 真机 WebDriverAgent 签名失败

表现：

```text
Unable to launch WebDriverAgent
xcodebuild failed
Signing for WebDriverAgentRunner requires a development team
```

应对：

```text
配置 xcodeOrgId
配置 xcodeSigningId
配置 updatedWDABundleId
在 Xcode 中手动打开 WDA 验证签名
确认设备加入开发者账号
确认 iPhone 开启 Developer Mode
```

---

### 12.5 图片上传/OCR 用例失败

原因：

```text
iOS 相册/文件选择器和 Android 差异很大
权限弹窗不同
文件路径机制不同
```

应对：

```text
先将 OCR/上传类用例标记为 iOS conditional
优先迁移纯 H5 页面用例
后续单独设计 iOS 图片上传适配层
```

---

## 13. 推荐迁移路线图

### Phase 0：准备阶段

目标：准备 iOS 自动化环境。

任务：

```text
准备 Mac
安装 Xcode
安装 Node.js/pnpm
安装项目依赖
安装 Appium XCUITest driver
获取 iOS 模拟器 .app 包
确认 Bundle ID
确认 WKWebView 可调试
```

验收标准：

```text
appium driver list 能看到 xcuitest
xcrun simctl list devices 能看到可用模拟器
iOS App 可在模拟器手动启动
```

---

### Phase 1：iOS POC

目标：跑通第一个 iOS WebView 用例。

任务：

```text
新增 .env.ios.example
新增 wdio.ios.conf.ts
新增 test:ios:webview 脚本
启动 Appium
运行 CX-WV-BASE-001
```

验收标准：

```text
Appium session 创建成功
App 启动成功
成功切换 WebView
成功获取 URL 和页面文本
```

---

### Phase 2：平台抽象

目标：避免 Android/iOS 逻辑混在一起。

任务：

```text
新增 platform.ts
新增 device-controller.ts
拆分 AndroidDeviceController
新增 IOSDeviceController
改造 AppController
改造 pre-run-reset
改造 artifacts 日志采集
改造 doctor.ts
```

验收标准：

```text
Android 原有 smoke 仍能跑
IOS smoke 能跑
共用 flows/pages 不需要大量 if/else
```

---

### Phase 3：迁移核心 smoke

目标：迁移核心主流程。

优先用例：

```text
webview
login
auth-state
deeplink
navigation
reading
chat-fast 部分
```

验收标准：

```text
test:ios:smoke 可以稳定运行
核心登录与 Chat 主链路可用
失败 artifact 能正常采集截图、page source、H5 state
```

---

### Phase 4：迁移完整 H5 用例

目标：尽可能复用现有 163 个用例。

任务：

```text
profile-fast
account-fast
materials-fast
medical-fast
extended-fast
```

处理策略：

```text
纯 H5 用例直接迁移
涉及系统权限、上传、OCR 的用例先 conditional
滚动、键盘、弹窗问题单独修复
```

验收标准：

```text
iOS extended-fast 可稳定运行
主要 P0/P1 H5 用例通过率达到可接受水平
conditional 用例有明确原因记录
```

---

### Phase 5：真机适配

目标：让 iOS 真机参与自动化测试。

任务：

```text
配置真机 UDID
配置 WebDriverAgent 签名
配置 xcodeOrgId/xcodeSigningId/updatedWDABundleId
安装真机测试包
开启 Developer Mode
开启 Safari Web Inspector
运行 iOS smoke
```

验收标准：

```text
iOS 真机可稳定创建 session
WebView context 可识别
smoke 主链路可跑
```

---

## 14. 建议的优先级

### 第一优先级

```text
iOS 模拟器 + WebView context + 登录 smoke
```

这是整个迁移的前提。

---

### 第二优先级

```text
平台抽象
wdio.ios.conf.ts
.env.ios.example
package.json iOS 脚本
```

这决定项目是否能长期维护双平台。

---

### 第三优先级

```text
迁移 Chat/Profile/Navigation 等主流程
```

这些是业务价值最高、复用率最高的部分。

---

### 第四优先级

```text
iOS 真机
图片上传
OCR
权限弹窗
```

这些问题复杂度较高，建议后置处理。

---

## 15. 最终建议

不建议重写当前自动化项目。

建议采用：

```text
单项目、双平台、共用业务层、分离设备层
```

最终目标结构：

```text
Androd_Auto_Test/
  wdio.android.conf.ts
  wdio.ios.conf.ts
  .env.example
  .env.ios.example
  src/
    config/
      env.ts
      accounts.ts
    core/
      platform.ts
      device-controller.ts
      android-device-controller.ts
      ios-device-controller.ts
      app-controller.ts
      webview-context.ts
      h5-runtime.ts
      case-runner.ts
      artifacts.ts
      pre-run-reset.ts
    pages/
    flows/
    specs/
```

迁移后的运行方式：

```bash
# Android
pnpm test:android:smoke
pnpm test:android:all

# iOS
pnpm test:ios:smoke
pnpm test:ios:all
```

这样可以最大化复用现有用例，同时控制 iOS 平台差异带来的维护成本。

---

## 16. 下一步落地任务清单

建议按以下顺序执行：

- [ ] 确认 Mac 和 Xcode 环境
- [ ] 获取 iOS 模拟器 `.app` 包
- [ ] 确认 iOS Bundle ID
- [ ] 确认 WKWebView 可调试
- [ ] 安装 Appium XCUITest driver
- [ ] 新增 `.env.ios.example`
- [ ] 新增 `wdio.ios.conf.ts`
- [ ] 新增 `test:ios:webview` 脚本
- [ ] 跑通 `CX-WV-BASE-001`
- [ ] 跑通登录相关用例
- [ ] 引入平台抽象层
- [ ] 改造 `AppController`
- [ ] 改造 `pre-run-reset`
- [ ] 改造 `doctor.ts`
- [ ] 迁移 `smoke` 套件
- [ ] 迁移 `extended-fast` 套件
- [ ] 最后处理 iOS 真机和图片/OCR 类用例

