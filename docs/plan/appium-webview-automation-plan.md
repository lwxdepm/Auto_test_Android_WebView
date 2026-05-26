# Appium Android WebView 自动化测试实现方案

> 保存时间：2026-05-07  
> 适用目录：`E:\Androd_Auto_Test\Androd_Auto_Test`  
> 目标项目参考：`E:\Androd_Auto_Test\cx-agent\packages\frontend`  
> 用例来源：`testcases/webview-h5-test-cases.csv`、`testcases/webview-h5-p0-fast-cases.csv`

本文档用于记录 Android App WebView 自动化测试的技术方案、工程设计、结果保存方案，以及后续按批次扩展用例的实现思路。后续实现时优先遵循本文档，避免重复确认基础设计。

---

## 1. 总体目标

在 `E:\Androd_Auto_Test\Androd_Auto_Test` 中搭建一套基于 Appium 的 Android WebView 自动化测试工程，用于快速验证：

- App 启动与 WebView Context 切换；
- 基础登录流程；
- 验证码登录异常场景；
- 协议勾选与协议弹窗；
- 登录态、登出、token 异常；
- WebView 深链重定向；
- WebView 首屏高度、白屏兜底；
- 软键盘不遮挡输入框；
- 测试结果按时间戳留档；
- 后续可扩展到 profile、chat、健康档案、OCR、材料、账号安全等模块。

---

## 2. 技术选型

### 2.1 推荐技术栈

```text
Appium
+ UiAutomator2 Driver
+ WebdriverIO
+ TypeScript
+ Mocha
+ JUnit Reporter
+ Allure Reporter
```

### 2.2 选择原因

- Appium 适合真实 Android App、Hybrid App、WebView 容器自动化；
- UiAutomator2 是 Android 端主流 Appium 驱动；
- WebdriverIO 对 Appium、TypeScript、Mocha、Reporter、Hook 支持成熟；
- TypeScript 与 `cx-agent` 前端技术栈一致，维护成本低；
- Page Object + Flow 分层便于后续增加用例；
- JUnit 适合 CI 集成，Allure 适合人工查看报告与附件。

### 2.3 Docker 说明

第一阶段不需要 Docker。

当前测试链路为：

```text
测试脚本 → Appium Server → adb → Android 真机/模拟器 → App WebView
```

所需依赖直接安装在本机即可：

- Node.js / pnpm；
- Appium；
- UiAutomator2 Driver；
- Android SDK / adb；
- Android 真机或模拟器。

Docker 仅作为未来可选能力，用于：

- 本地启动后端依赖，如 Redis/PostgreSQL；
- CI 中固定 Node/Appium 测试环境；
- 不建议第一阶段用 Docker 跑 Android 模拟器。

---

## 3. 测试范围与用例优先级

### 3.1 第一阶段优先覆盖用例

优先覆盖适合快速自动验证、稳定、非破坏性的基础用例。

| 用例ID | 功能 | 自动化策略 |
|---|---|---|
| CX-WV-BASE-001 | App 启动 WebView | Appium 启动 App，等待并切换 WebView Context |
| CX-WV-BASE-002 | 正确验证码登录 | 使用固定验证码，如 `123` |
| CX-WV-BASE-003 | 错误验证码 | 输入错误验证码，断言错误提示 |
| CX-WV-BASE-004 | 无效手机号 | 前端校验，断言手机号错误提示 |
| CX-WV-BASE-005 | 重复获取验证码 | 断言按钮禁用或倒计时 |
| CX-WV-BASE-006 | 协议未勾选 | 输入手机号验证码但不勾选协议，断言提示 |
| CX-WV-BASE-007 | 用户协议弹窗 | 点击用户协议，断言弹窗可打开可关闭 |
| CX-WV-BASE-008 | 隐私政策弹窗 | 点击隐私政策，断言隐私政策可到达并关闭 |
| CX-WV-BASE-010 | 正常退出登录 | 登录后打开侧边栏，点击退出登录 |
| CX-WV-BASE-011 | 登出后返回 | 登出后执行 Android 返回，断言不回到登录态页 |
| CX-WV-BASE-017 | token 失效自动退出 | 写入错误 `cx-token`，触发接口后回登录页 |
| CX-WV-BASE-019 | 验证码输入过滤 | 粘贴非法字符和超长数字，断言只保留最多 6 位数字 |
| CX-WV-BASE-020 | 深链未登录重定向 | 清登录态后访问业务路由，统一回 `/login` |
| CX-WV-COMPAT-001 | 首屏高度与白屏兜底 | 启动登录页/聊天页，断言非白屏且高度正常 |
| CX-WV-COMPAT-002 | 软键盘不遮挡输入框 | 聚焦 Chat 输入框，断言输入框与发送按钮仍可见 |
| CX-WV-COMPAT-004 | 深链刷新/重进 | 登录态下打开或刷新深链，断言路由恢复且无白屏 |

### 3.2 暂缓或拆分专项用例

| 用例ID | 暂缓原因 | 建议套件 |
|---|---|---|
| CX-WV-BASE-009 | 会清 App 数据 | reset/destructive |
| CX-WV-BASE-012 | 需要关闭/重启 App | lifecycle |
| CX-WV-BASE-013 | 验证码 TTL 5 分钟，不建议真实等待 | sms-edge，需要 Redis/测试钩子 |
| CX-WV-BASE-014 | 验证码一次性使用，依赖账号状态 | sms-edge |
| CX-WV-BASE-015 | 后端限流需接口辅助 | sms-edge/api |
| CX-WV-BASE-016 | 需要 pending_deletion 预置账号 | account-state |
| CX-WV-BASE-018 | 需要 A/B 账号与隔离数据 | account-isolation |
| CX-WV-COMPAT-003 | 依赖 App 容器返回键策略 | compat/manual |
| CX-WV-COMPAT-005 | 依赖系统文件选择器、相册和 App file chooser | file/manual |

---

## 4. 工程目录设计

建议在 `Androd_Auto_Test` 根目录下创建以下结构：

```text
Androd_Auto_Test/
├─ package.json
├─ tsconfig.json
├─ wdio.android.conf.ts
├─ .env.example
├─ testcases/
│  ├─ webview-h5-test-cases.csv
│  ├─ webview-h5-p0-fast-cases.csv
│  └─ ...
├─ docs/
│  └─ appium-webview-automation-plan.md
├─ src/
│  ├─ config/
│  │  ├─ env.ts
│  │  ├─ accounts.ts
│  │  └─ case-manifest.ts
│  ├─ core/
│  │  ├─ app-controller.ts
│  │  ├─ webview-context.ts
│  │  ├─ h5-runtime.ts
│  │  ├─ case-runner.ts
│  │  ├─ artifacts.ts
│  │  ├─ run-context.ts
│  │  └─ wait.ts
│  ├─ pages/
│  │  ├─ LoginPage.ts
│  │  ├─ ChatPage.ts
│  │  ├─ SideDrawerPage.ts
│  │  └─ AgreementModal.ts
│  ├─ flows/
│  │  ├─ auth.flow.ts
│  │  ├─ logout.flow.ts
│  │  ├─ route.flow.ts
│  │  └─ webview.flow.ts
│  ├─ specs/
│  │  ├─ 01-webview-start.spec.ts
│  │  ├─ 02-login-basic.spec.ts
│  │  ├─ 03-auth-state.spec.ts
│  │  ├─ 04-deeplink.spec.ts
│  │  └─ 05-webview-container-fast.spec.ts
│  └─ scripts/
│     ├─ sync-cases.ts
│     └─ doctor.ts
└─ reports/
   └─ runs/
```

---

## 5. Appium Context 策略

### 5.1 Native Context

```text
NATIVE_APP
```

用于：

- 启动 App；
- Android 系统返回；
- 清 App 数据；
- 关闭/重启 App；
- 系统权限弹窗；
- 文件选择器；
- 采集 logcat；
- 必要时处理原生壳层控件。

### 5.2 WebView Context

```text
WEBVIEW_xxx
```

用于：

- H5 登录页操作；
- H5 路由跳转和断言；
- localStorage 读写；
- 获取 `window.location.href`；
- 获取页面 HTML；
- 判断白屏；
- Chat 输入框、侧边栏、协议弹窗等 H5 元素操作。

### 5.3 Context 切换原则

- Suite 启动后先在 Native 启动 App；
- 等待出现 WebView Context；
- 绝大多数 H5 用例在 WebView Context 中执行；
- 涉及系统返回、杀进程、文件选择器、权限弹窗时切回 Native；
- 每条用例失败时保存当前 context 列表和当前 context。

---

## 6. 核心模块职责

### 6.1 `src/core/webview-context.ts`

职责：

- 等待 WebView Context；
- 切换到 WebView；
- 切回 Native；
- 获取 context 列表；
- Context 切换失败时提供诊断信息。

建议 API：

```ts
await WebViewContext.waitForWebView()
await WebViewContext.switchToWebView()
await WebViewContext.switchToNative()
await WebViewContext.getContextsSnapshot()
```

---

### 6.2 `src/core/h5-runtime.ts`

职责：

- 获取当前 URL；
- 获取当前路径；
- 执行 JS；
- 读写 localStorage；
- 清理登录态；
- 判断页面是否白屏；
- 采集 WebView HTML。

关注 localStorage key：

```text
cx-token
cx-consents
cx-needs-profile
cx-require-complete-profile
```

建议 API：

```ts
await H5Runtime.getCurrentUrl()
await H5Runtime.goto('/chat')
await H5Runtime.setLocalStorage('cx-token', 'invalid-token')
await H5Runtime.removeLocalStorage('cx-token')
await H5Runtime.clearLoginStorage()
await H5Runtime.dumpLocalStorage()
await H5Runtime.getHtml()
await H5Runtime.expectNotBlank()
```

---

### 6.3 `src/core/app-controller.ts`

职责：

- 启动 App；
- 关闭 App；
- 重启 App；
- Android 返回；
- 清 App 数据；
- 获取设备信息；
- 拉取 logcat。

建议 API：

```ts
await AppController.launch()
await AppController.terminate()
await AppController.restart()
await AppController.pressBack()
await AppController.clearAppData()
await AppController.getDeviceInfo()
await AppController.collectLogcat()
```

---

### 6.4 `src/core/run-context.ts`

职责：

- 每次执行生成唯一 `runId`；
- 以时间戳创建报告目录；
- 设置 Reporter 输出目录；
- 提供当前运行目录给其他模块使用。

时间戳格式：

```text
YYYY-MM-DD_HH-mm-ss
```

示例：

```text
2026-05-07_14-26-33
```

---

### 6.5 `src/core/artifacts.ts`

职责：

失败时采集现场：

```text
screenshot.png
page-source.xml
webview-html.html
current-url.txt
local-storage.json
contexts.json
device-info.json
logcat.txt
error.json
```

保存路径：

```text
reports/runs/{runId}/artifacts/{caseId}/
```

---

### 6.6 `src/core/case-runner.ts`

职责：

- 绑定 CSV 用例 ID；
- 自动记录用例开始/结束时间；
- 记录用例结果到 `cases.json`；
- 失败时触发 artifact 采集；
- 生成 summary 统计数据。

建议使用方式：

```ts
itCase('CX-WV-BASE-002', '正确验证码登录', async () => {
  await AuthFlow.loginWithFixedCode(accounts.normal)
})
```

---

## 7. Page Object 设计

### 7.1 `LoginPage.ts`

当前前端可用元素：

| 元素 | 当前 Selector |
|---|---|
| 手机号输入框 | `input[placeholder="请输入手机号"]` |
| 验证码输入框 | `input[placeholder="请输入验证码"]` |
| 获取验证码按钮 | 文本 `获取验证码` |
| 重新发送按钮 | 文本 `重新发送` 或倒计时文本 |
| 登录按钮 | 文本 `登录` |
| 协议 checkbox | `#agreement-checkbox` |
| 用户协议链接 | 文本 `《用户协议》` |
| 隐私政策链接 | 文本 `《隐私政策》` |
| 错误提示 | 文本包含，如 `请输入正确的手机号`、`验证码错误或已过期` |

建议能力：

```ts
await LoginPage.waitForLoaded()
await LoginPage.inputPhone(phone)
await LoginPage.clickSendCode()
await LoginPage.inputCode(code)
await LoginPage.checkAgreement()
await LoginPage.submitLogin()
await LoginPage.expectErrorContains(text)
await LoginPage.expectStillOnLogin()
await LoginPage.openUserAgreement()
await LoginPage.openPrivacyPolicy()
```

---

### 7.2 `ChatPage.ts`

当前前端可用元素：

| 元素 | 当前 Selector |
|---|---|
| 页面标题 | 文本 `橙欣健康` |
| 侧边栏按钮 | `button[title="对话记录"]` |
| 新对话按钮 | `button[title="新对话"]` |
| 聊天输入框 | `textarea[placeholder="输入您的问题..."]` |
| 停止生成按钮 | `[aria-label="停止生成"]` |

建议能力：

```ts
await ChatPage.waitForLoaded()
await ChatPage.openDrawer()
await ChatPage.inputMessage(text)
await ChatPage.focusInput()
await ChatPage.expectInputVisibleAboveKeyboard()
await ChatPage.expectNotBlank()
```

---

### 7.3 `SideDrawerPage.ts`

当前前端可用元素：

| 元素 | 当前 Selector |
|---|---|
| 退出登录 | 文本 `退出登录` |
| 个人信息 | 文本 `个人信息` |
| 阅读设置 | 文本 `阅读设置` |
| 健康档案 | 文本 `健康档案` |
| 我的材料 | 文本 `我的材料` |
| 新对话 | `title="新对话"` 或浮动按钮 |

建议能力：

```ts
await SideDrawerPage.waitForOpened()
await SideDrawerPage.logout()
await SideDrawerPage.openProfile()
await SideDrawerPage.openMedicalRecords()
await SideDrawerPage.openReadingSettings()
await SideDrawerPage.openMaterials()
```

---

### 7.4 `AgreementModal.ts`

当前前端可用元素：

| 元素 | Selector |
|---|---|
| 弹窗标题 | `用户协议` / `隐私政策` / `健康档案授权` |
| 关闭按钮 | `[aria-label="关闭"]` |
| 主按钮 | `下一份《隐私政策》` / `我已阅读并同意` |

建议能力：

```ts
await AgreementModal.expectTitle(title)
await AgreementModal.close()
await AgreementModal.clickPrimary()
```

---

## 8. Selector 策略

### 8.1 第一版策略

由于当前前端没有统一 `data-testid`，第一版使用：

- placeholder；
- button title；
- aria-label；
- 中文文本；
- id，如 `#agreement-checkbox`。

### 8.2 长期建议

建议后续前端补充：

```tsx
data-testid="login-phone-input"
data-testid="login-code-input"
data-testid="login-send-code-btn"
data-testid="login-submit-btn"
data-testid="login-agreement-checkbox"
data-testid="login-user-agreement-link"
data-testid="login-privacy-policy-link"
data-testid="chat-menu-btn"
data-testid="chat-input"
data-testid="drawer-logout-btn"
```

测试框架中统一封装 fallback：

```ts
selector.byTestIdOrCss('login-phone-input', 'input[placeholder="请输入手机号"]')
```

这样前端补充 `data-testid` 后，不需要大规模改脚本。

---

## 9. Flow 设计

### 9.1 登录 Flow

```ts
await AuthFlow.loginWithFixedCode(account)
```

流程：

1. 等待登录页加载；
2. 输入手机号；
3. 点击获取验证码；
4. 输入固定验证码，如 `123`；
5. 勾选用户协议；
6. 点击登录；
7. 等待进入 `/chat` 或 `/profile`；
8. 断言 `cx-token` 已写入 localStorage。

---

### 9.2 错误验证码 Flow

```ts
await AuthFlow.loginWithWrongCode(account)
```

断言：

- 展示 `验证码错误或已过期`；
- 仍停留 `/login`；
- localStorage 不应出现有效 `cx-token`。

---

### 9.3 协议未勾选 Flow

```ts
await AuthFlow.assertAgreementRequired(account)
```

断言：

- 展示 `请先阅读并同意《用户协议》与《隐私政策》`；
- 不进入登录态页面。

---

### 9.4 登出 Flow

```ts
await LogoutFlow.logoutFromDrawer()
```

流程：

1. 登录态进入 Chat；
2. 打开侧边栏；
3. 点击退出登录；
4. 等待回到登录页；
5. 断言 `cx-token`、`cx-consents`、`cx-needs-profile` 清除；
6. 执行 Android 返回；
7. 断言不会回到 `/chat`。

---

### 9.5 深链未登录 Flow

```ts
await RouteFlow.assertUnauthRedirect('/medical-records')
```

覆盖路径：

```text
/chat/fake-session-id
/medical-records
/materials
/profile
/account-security
/reading-settings
```

断言：

- 最终回到 `/login`；
- 登录页元素可见；
- 页面不是白屏。

---

### 9.6 token 失效 Flow

```ts
await AuthStateFlow.assertInvalidTokenAutoLogout()
```

流程：

1. 写入错误 `cx-token`；
2. 跳转 `/chat`；
3. 触发需要登录态的接口，例如打开侧边栏加载会话；
4. 收到 401 后前端调用 logout；
5. 断言回 `/login`；
6. 断言本地登录态清除。

---

### 9.7 WebView 容器 Flow

```ts
await WebViewFlow.assertStartupNotBlank()
await WebViewFlow.assertKeyboardDoesNotCoverInput()
await WebViewFlow.assertDeepLinkRefreshWorks()
```

重点断言：

- `document.body.innerText` 不为空；
- `document.documentElement.clientHeight` 大于合理阈值；
- 登录页或 Chat 页可见；
- 聚焦输入框后输入框和发送按钮仍在可视区域；
- `--keyboard-offset` 不为负值。

---

## 10. 测试结果保存方案

### 10.1 每次运行按时间戳建目录

每次执行生成独立 `runId`：

```text
YYYY-MM-DD_HH-mm-ss
```

保存路径：

```text
reports/runs/{runId}/
```

示例：

```text
reports/
└─ runs/
   └─ 2026-05-07_14-26-33/
      ├─ summary.json
      ├─ cases.json
      ├─ environment.json
      ├─ case-coverage.json
      ├─ junit/
      ├─ allure-results/
      ├─ html/
      └─ artifacts/
```

### 10.2 单条失败用例 artifact

```text
artifacts/
└─ CX-WV-BASE-002/
   ├─ screenshot.png
   ├─ page-source.xml
   ├─ webview-html.html
   ├─ current-url.txt
   ├─ local-storage.json
   ├─ contexts.json
   ├─ device-info.json
   ├─ logcat.txt
   └─ error.json
```

### 10.3 `summary.json` 示例

```json
{
  "runId": "2026-05-07_14-26-33",
  "suite": "webview-p0-fast",
  "startedAt": "2026-05-07T14:26:33+08:00",
  "endedAt": "2026-05-07T14:31:10+08:00",
  "total": 16,
  "passed": 15,
  "failed": 1,
  "skipped": 0,
  "failedCases": ["CX-WV-BASE-008"]
}
```

### 10.4 `cases.json` 示例

```json
[
  {
    "caseId": "CX-WV-BASE-001",
    "title": "App 启动 WebView",
    "priority": "P0",
    "status": "passed",
    "durationMs": 4210
  },
  {
    "caseId": "CX-WV-BASE-008",
    "title": "隐私政策弹窗",
    "priority": "P1",
    "status": "failed",
    "durationMs": 8120,
    "error": "期望打开隐私政策，但实际标题为用户协议"
  }
]
```

---

## 11. 配置文件设计

### 11.1 `.env.example`

```env
ANDROID_DEVICE_NAME=emulator-5554
ANDROID_PLATFORM_VERSION=14
ANDROID_APP_PACKAGE=com.example.cxapp
ANDROID_APP_ACTIVITY=.MainActivity

APPIUM_HOST=127.0.0.1
APPIUM_PORT=4723

WEBVIEW_CONTEXT_PATTERN=WEBVIEW
SMS_FIXED_CODE=123

TEST_PHONE_A=13800000001
TEST_PHONE_B=13800000002
TEST_PHONE_PENDING=13800000003

CLEAR_APP_BEFORE_SUITE=false
RECORD_LOGCAT=true
REPORT_KEEP_RUNS=30
```

### 11.2 运行命令设计

```bash
pnpm install
pnpm run doctor
pnpm test:android:smoke
pnpm test:android:login
pnpm test:android:auth-state
pnpm test:android:webview
pnpm test:android:all
pnpm cases:coverage
```

建议 `package.json` scripts：

```json
{
  "scripts": {
    "doctor": "tsx src/scripts/doctor.ts",
    "test:android:smoke": "wdio run wdio.android.conf.ts --suite smoke",
    "test:android:login": "wdio run wdio.android.conf.ts --suite login",
    "test:android:auth-state": "wdio run wdio.android.conf.ts --suite authState",
    "test:android:webview": "wdio run wdio.android.conf.ts --suite webview",
    "test:android:all": "wdio run wdio.android.conf.ts",
    "cases:coverage": "tsx src/scripts/sync-cases.ts"
  }
}
```

---

## 12. 后续添加用例方式

### 12.1 新增用例标准流程

1. 在 CSV 中确认用例 ID；
2. 判断该用例属于哪个套件：smoke、login、auth-state、webview、profile、chat、medical、slow、destructive、manual；
3. 如果已有 Page Object 和 Flow，直接新增 spec；
4. 如果没有页面能力，先补 Page Object；
5. 如果业务路径较长，补 Flow；
6. 使用 `itCase(caseId, title, fn)` 绑定用例；
7. 执行 `pnpm cases:coverage` 检查覆盖率。

示例：

```ts
itCase('CX-WV-BASE-014', '验证码一次性使用', async () => {
  const code = await AuthFlow.sendCodeAndReturnFixedCode(accounts.normal)

  await AuthFlow.loginWithCode(accounts.normal.phone, code)
  await LogoutFlow.logoutFromDrawer()

  await AuthFlow.loginWithCode(accounts.normal.phone, code)
  await LoginPage.expectErrorContains('验证码错误或已过期')
  await LoginPage.expectStillOnLogin()
})
```

### 12.2 添加用例时通常只改这些地方

常规新增：

```text
src/specs/xx.spec.ts
```

必要时新增或修改：

```text
src/pages/xxxPage.ts
src/flows/xxx.flow.ts
```

无需重复修改：

```text
WebView Context 切换
结果保存
截图采集
CSV 绑定
报告生成
localStorage 工具
App 启动逻辑
```

---

## 13. 一键执行所有测试用例

### 13.1 支持一键执行所有“已实现自动化用例”

命令：

```bash
pnpm test:android:all
```

该命令执行 `src/specs/**/*.spec.ts` 中所有已实现的自动化用例。

### 13.2 CSV 全量用例需要分层

`webview-h5-test-cases.csv` 中包含大量用例，其中一部分适合全自动，一部分是：

- 半自动；
- 依赖真实 OCR；
- 依赖真实 AI 流式返回；
- 依赖文件选择器；
- 依赖系统相册；
- 依赖麦克风权限；
- 依赖破坏性账号；
- 依赖后端测试钩子；
- 依赖慢速外部服务。

因此推荐区分：

```text
smoke       快速稳定，日常必跑
all         所有已实现自动化用例
slow        OCR/AI/ASR 慢速用例
destructive 清空档案、注销账号、删除文档等破坏性用例
manual      半自动/人工辅助用例
```

---

## 14. 用例分组建议

建议每条用例增加标签：

```ts
itCase('CX-WV-BASE-002', '正确验证码登录', {
  tags: ['smoke', 'login', 'p0'],
}, async () => {
  await AuthFlow.loginWithFixedCode(accounts.normal)
})
```

支持以下运行方式：

```bash
pnpm test:android:smoke
pnpm test:android:login
pnpm test:android:webview
pnpm test:android:all
```

后续也可扩展为：

```bash
pnpm test:android -- --tag p0
pnpm test:android -- --tag destructive
pnpm test:android -- --tag slow
```

---

## 15. 按批次实现路线

### 第一批：基础框架与登录冒烟

目标：先跑通 Appium + WebView + 登录主链路。

交付内容：

- `package.json`；
- `tsconfig.json`；
- `wdio.android.conf.ts`；
- `.env.example`；
- `run-context.ts`；
- `webview-context.ts`；
- `h5-runtime.ts`；
- `artifacts.ts`；
- `case-runner.ts`；
- `LoginPage.ts`；
- `ChatPage.ts`；
- `auth.flow.ts`；
- `01-webview-start.spec.ts`；
- `02-login-basic.spec.ts`。

覆盖用例：

```text
CX-WV-BASE-001
CX-WV-BASE-002
CX-WV-BASE-003
CX-WV-BASE-004
CX-WV-BASE-005
CX-WV-BASE-006
CX-WV-BASE-007
CX-WV-BASE-008
CX-WV-BASE-019
```

---

### 第二批：登出、登录态、深链

目标：覆盖登录态生命周期和路由安全。

交付内容：

- `SideDrawerPage.ts`；
- `logout.flow.ts`；
- `route.flow.ts`；
- `03-auth-state.spec.ts`；
- `04-deeplink.spec.ts`。

覆盖用例：

```text
CX-WV-BASE-010
CX-WV-BASE-011
CX-WV-BASE-017
CX-WV-BASE-020
```

---

### 第三批：WebView 容器 fast

目标：覆盖 WebView 兼容性中适合快速自动化的部分。

交付内容：

- `webview.flow.ts`；
- `05-webview-container-fast.spec.ts`；
- 键盘可视区断言工具；
- 页面非白屏断言工具。

覆盖用例：

```text
CX-WV-COMPAT-001
CX-WV-COMPAT-002
CX-WV-COMPAT-004
```

---

### 第四批：Profile 与侧边栏导航

目标：扩大到 `/profile` 和侧边栏基础导航。

建议新增：

```text
src/pages/ProfilePage.ts
src/pages/ReadingSettingsPage.ts
src/flows/profile.flow.ts
src/flows/navigation.flow.ts
```

优先覆盖：

```text
CX-PROFILE-001 ~ CX-PROFILE-008
CX-NAV-001 ~ CX-NAV-010
```

---

### 第五批：Chat 基础功能

目标：覆盖对话页基础交互，不评估 AI 医学回答质量。

建议新增：

```text
src/pages/InputBar.ts
src/pages/MessageList.ts
src/flows/chat.flow.ts
```

优先覆盖：

```text
CX-CHAT-001
CX-CHAT-002
CX-CHAT-004
CX-CHAT-007
CX-CHAT-010
CX-INPUT-001
CX-INPUT-002
CX-INPUT-003
CX-INPUT-014
```

---

### 第六批：健康档案授权与基础档案页

目标：覆盖健康授权、健康档案页面加载、基础返回。

建议新增：

```text
src/pages/HealthConsentDialog.ts
src/pages/MedicalRecordsPage.ts
src/flows/medical-records.flow.ts
```

优先覆盖：

```text
CX-CONSENT-001 ~ CX-CONSENT-004
CX-MED-001 ~ CX-MED-005
```

---

### 第七批：文件、OCR、账号安全、慢速专项

目标：覆盖需要外部依赖或破坏性账号的用例。

建议拆分：

```text
slow
file
ocr
account-security
destructive
```

优先条件：

- 准备专用账号；
- 准备图片测试资源；
- 明确是否允许删除/清空数据；
- 接入 Redis 或后端测试钩子；
- 慢速套件不进入日常 smoke。

---

## 16. 用例覆盖率管理

实现 `src/scripts/sync-cases.ts`：

功能：

- 读取 `testcases/webview-h5-test-cases.csv`；
- 读取测试代码中所有 `itCase('CASE-ID')`；
- 输出已实现、未实现、跳过、半自动列表；
- 生成覆盖率文件。

输出路径：

```text
reports/runs/{runId}/case-coverage.json
```

示例：

```json
{
  "source": "webview-h5-test-cases.csv",
  "csvTotal": 233,
  "implemented": 16,
  "notImplemented": 217,
  "smokeImplemented": 13,
  "manualOrSemiAuto": 0
}
```

---

## 17. 前端已发现注意点

### 17.1 隐私政策链接行为

当前 `Login.tsx` 中：

- 用户协议链接会调用 `setAgreementStep(0)`；
- 隐私政策链接当前也调用 `setAgreementStep(0)`。

这意味着点击隐私政策时可能先打开“用户协议”，再通过主按钮进入“隐私政策”。

后续实现 `CX-WV-BASE-008` 时需要确认断言口径：

1. 如果产品要求“点击隐私政策直接打开隐私政策”，前端需要修正；
2. 如果产品接受链式阅读，则测试断言“可以进入隐私政策并关闭”。

### 17.2 WebView Debug 必须开启

Android App 测试包需要开启：

```java
WebView.setWebContentsDebuggingEnabled(true);
```

否则 Appium 无法稳定切换 WebView Context。

### 17.3 Chromedriver 与 WebView 内核匹配

Android WebView 自动化依赖 Chromedriver。后续 `doctor.ts` 需要检查：

- adb 是否可用；
- 设备是否连接；
- Appium 是否启动；
- App 是否能启动；
- WebView Context 是否可发现；
- Chromedriver 是否匹配。

---

## 18. 最终验收标准

第一阶段初步搭建完成后，应满足：

1. 可以通过 `pnpm test:android:smoke` 一键执行基础 smoke；
2. 可以切换到 WebView Context；
3. 可以完成固定验证码登录；
4. 可以验证登录失败、协议未勾选、手机号错误；
5. 可以完成登出和 token 清理断言；
6. 每次运行结果保存到时间戳目录；
7. 失败用例有截图、HTML、localStorage、contexts、logcat；
8. 可以通过 `pnpm test:android:all` 跑所有已实现自动化用例；
9. 可以通过 `pnpm cases:coverage` 查看 CSV 用例实现覆盖率；
10. 后续新增用例主要通过新增 spec、Page Object、Flow 完成，不需要重复搭建框架。

---

## 19. 后续实现时的默认决策

如无额外说明，后续实现默认采用以下决策：

- 使用 Appium + WebdriverIO + TypeScript；
- 不使用 Docker；
- 测试结果按时间戳保存；
- 以 CSV 用例 ID 作为报告主键；
- 第一阶段优先实现基础登录与 WebView fast 用例；
- 使用固定验证码 `123`；
- 默认只跑非破坏性 fast 用例；
- 破坏性、慢速、半自动用例单独分套件；
- 页面定位先用现有 placeholder/title/text/aria/id，后续兼容 `data-testid`；
- 一键全量命令只跑“已实现自动化用例”，CSV 中半自动/人工用例需明确转换后再进入自动化套件。

---

## 20. 2026-05-07 扩展实现批次记录

本批次在第一版登录/WebView smoke 基础上，继续实现 CSV 中“可快速自动化、非强破坏、非强依赖 AI/OCR/系统权限”的用例，当前代码扫描覆盖：

```text
已实现 106 / 221
```

新增范围：

- 侧边栏导航：打开/关闭、个人信息、健康档案、我的材料、阅读设置、新对话、历史空态/列表、素材上传台可见性、删除会话二次确认取消。
- 阅读设置：页面进入、三档字号切换、localStorage 持久化、跨 Chat/Materials 字号 CSS 变量、返回后重新打开侧栏。
- Chat/Input：对话页加载、欢迎建议问题、空消息不可发送、新对话、Shift+Enter、超长文本限制、上传/语音入口存在。
- 个人信息：元素展示、昵称、出生日期、关注情况、性别、非首次跳过、编辑返回、模拟首次强制资料不可跳过/部分保存拦截、returnSessionId 返回。
- 我的材料：页面、空态（条件）、Tab、返回聊天/侧栏、沟通卡/跟练卡列表与详情（有预置数据时）、沟通卡编辑取消。
- 健康授权/健康档案/OCR 入口：授权弹窗/同意/拒绝/远端同步、健康档案页、病历档案编辑取消、多个结构化字段选择（字段可见时）、上传病历页入口/元素/取消、病历文档详情（有预置文档时）。
- 账号安全：页面、返回、清空健康档案弹窗打开/取消、注销弹窗打开/取消、阅读倒计时、确认短语校验。

实现原则：

- 缺少预置材料、历史会话、病历文档、特定健康字段时，相关用例通过 `skipCase()` 记录为 `skipped`，避免把“环境缺少前置数据”误报为失败。
- 仍不把真实 AI 回复质量、真实 OCR 识别、真实文件选择器、清空档案确认、注销确认、删除数据等放入 fast 主路径。
- `pnpm test:android:extended-fast` 可运行本批次新增 fast 套件；`pnpm test:android:all` 运行所有已实现用例。

## 21. 2026-05-07 失败用例修正记录

针对 `pnpm test:android:all` 中的失败项，已做以下调整：

- `CX-PROFILE-003/013/014`：不再用主账号 `TEST_PHONE_A` 模拟首次资料流程，改为专用未完善资料账号 `TEST_PHONE_NEEDS_PROFILE`；未配置时记录为 `skipped`。同时昵称清空改为原生 value setter + input/change 事件，适配 React controlled input。
- `CX-CHAT-006`：Shift+Enter 用例改为通过 WebView JS 读取 textarea.value，避免 Android WebView 中 `getValue()` 读空导致误判。
- `CX-MED-010/011/012/013/014/015/030`：用药情况面板打开改为 scrollIntoView + JS click；自定义药名输入改为原生 value setter + input/change 事件；“完成/添加/暂未用药/不确定”等操作也改为更稳定的 DOM 点击。
- `CX-WV-BASE-012`：Appium session 内重启 App 对 WebView/Chromedriver 比较敏感，默认通过 `RESTART_APP_CASE_ENABLED=false` 跳过；需要专项验证时打开该开关，并使用更稳健的 `am force-stop` + `am start -W -n` 重启流程。

## 22. 未完善资料账号手机号自动递增

为避免 `CX-PROFILE-003/013/014` 重复使用同一个手机号导致账号不再是“新账号”，框架支持在每个需要“未完善资料新账号”的 Profile 用例执行前自动分配一个递增手机号：

```env
TEST_PHONE_NEEDS_PROFILE=
TEST_PHONE_NEEDS_PROFILE_AUTO_INCREMENT=true
TEST_PHONE_NEEDS_PROFILE_BASE=19900010000
TEST_PHONE_NEEDS_PROFILE_STATE_FILE=.test-state/phone-sequence.json
```

行为：

- 仅在运行 WDIO 测试时分配，不会被 `pnpm doctor` 或 `pnpm cases:coverage` 消耗；
- 首次使用 `TEST_PHONE_NEEDS_PROFILE_BASE`，后续每个需要新账号的用例在上次基础上 `+1`；
- 分配结果写入 `process.env.TEST_PHONE_NEEDS_PROFILE`，worker 进程继承同一个值，避免一次运行内重复递增；
- 状态文件 `.test-state/phone-sequence.json` 已加入 `.gitignore`。

注意：该模式适用于测试/开发环境固定验证码且不会真实发送短信的场景；如果环境会真实发短信，请改用固定的专用测试手机号或后端测试钩子。
