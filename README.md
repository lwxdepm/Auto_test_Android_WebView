# Android WebView 自动化测试说明

本项目用于 Android WebView 套壳 App 的自动化测试，技术栈为：

```text
Appium 3 + UiAutomator2 + WebdriverIO + TypeScript + Mocha + pnpm
```

当前工程已经支持 P0 冒烟、legacy 快速回归、业务闭环专项、原生 bridge 专项、JUnit/Allure 报告和失败证据归档。README 只保留快速上手信息，完整策略与规范请查看 [文档导航](#6-文档导航)。

---

## 1. 快速开始

### 1.1 安装依赖和 Appium driver

```bash
cd /Users/liangjiayi/Desktop/ctz/Auto_test_Android_WebView
pnpm install
pnpm run appium:install:driver
pnpm run appium:driver:list
```

### 1.2 配置 `.env`

```bash
cp .env.example .env
code .env
```

最少需要检查：

```env
ANDROID_DEVICE_NAME=adb devices 看到的设备名
ANDROID_PLATFORM_VERSION=设备实际 Android 版本，也可以留空
ANDROID_APP_PACKAGE=com.cx.agent
ANDROID_APP_ACTIVITY=com.cx.agent.MainActivity
TEST_PHONE_A=已完成资料且能进入 Chat 的测试账号
SMS_FIXED_CODE=测试环境固定验证码
START_APPIUM=false
```

注意：`.env` 可以填写真实测试账号，`.env.example` 和文档中只允许放占位值。

### 1.3 检查环境

```bash
adb devices
adb shell getprop ro.build.version.release
pnpm run doctor
```

如果 `doctor` 只有 `App main process pid` 失败，通常只是 App 当前未打开，不代表 App 未安装。

### 1.4 启动 Appium

开一个终端保持运行：

```bash
pnpm run appium
```

再开第二个终端执行测试。

---

## 2. 推荐执行顺序

### 2.1 先跑 P0 冒烟

```bash
pnpm run test:android:smoke-core
```

`smoke-core` 当前包含 10 条主链路用例，用于快速确认 App/WebView 可打开、登录可用、Chat 可进入和发送、侧栏/材料/健康档案入口可用、键盘不遮挡。

### 2.2 冒烟通过后跑 legacy 快速回归

```bash
pnpm run test:android:legacy
```

`legacy` 当前为 163 条快速回归用例，不包含相机、相册、麦克风等高波动原生专项，适合作为日常主要回归命令。

### 2.3 按改动补跑专项

```bash
pnpm run test:android:bridge
pnpm run test:android:bridge-slow
pnpm run test:android:business
```

- 涉及相册、相机、麦克风、复制粘贴等原生能力时，补跑 `bridge` / `bridge-slow`。
- 涉及 Agent、模型、SSE、材料、健康档案等业务闭环时，补跑 `business`。
- 不建议把 `test:android:all` 当作日常快速回归，因为它会包含业务 LLM 和原生专项。

---

## 3. 常用命令

| 命令 | 用途 | 建议场景 |
| --- | --- | --- |
| `pnpm run doctor` | 检查本地环境、设备、Appium 配置 | 每次新环境或异常排查 |
| `pnpm run appium` | 启动 Appium server | 本地执行前 |
| `pnpm run test:android:smoke-core` | 10 条 P0/P1 冒烟 | 每次提测/回归前 |
| `pnpm run test:android:legacy` | 163 条快速回归 | 日常主回归 |
| `pnpm run test:android:extended-fast` | 导航、聊天、个人信息、材料、健康档案扩展快速用例 | 模块回归 |
| `pnpm run test:android:bridge` | 原生 bridge 专项 4 条 | 原生能力变更后 |
| `pnpm run test:android:bridge-slow` | 相机专项 1 条 | 相机能力专项验证 |
| `pnpm run test:android:business` | 业务闭环专项 13 条 | Agent/模型/业务链路验证 |
| `pnpm run test:android:all` | 当前所有执行入口 | 发版前或夜间全量，不建议日常使用 |
| `pnpm run cases:coverage` | 生成用例覆盖统计 | 用例变更后 |
| `pnpm run typecheck` | TypeScript 类型检查 | 修改代码后 |

只跑某条 case：

```bash
pnpm exec wdio run wdio.android.conf.ts --suite legacy --mochaOpts.grep "CX-CHAT-001"
```

---

## 4. 测试报告

每次运行会生成：

```text
reports/runs/YYYY-MM-DD_HH-mm-ss/
├─ summary.json
├─ cases.json
├─ environment.json
├─ pre-run-reset.json
├─ junit/
├─ allure-results/
└─ artifacts/
```

查看最近一次结果：

```bash
RUN_ID=$(head -n 1 reports/runs/latest-run.txt)
cat "reports/runs/$RUN_ID/summary.json"
```

打开最近一次报告目录：

```bash
RUN_DIR=$(sed -n '2p' reports/runs/latest-run.txt)
open "$RUN_DIR"
```

失败证据通常位于：

```text
reports/runs/{runId}/artifacts/{caseId}/
```

---

## 5. 常见排查入口

- Android 版本不匹配：检查 `adb shell getprop ro.build.version.release` 和 `.env` 中的 `ANDROID_PLATFORM_VERSION`。
- 找不到 WebView context：确认测试包开启 `WebView.setWebContentsDebuggingEnabled(true)`。
- 相册/相机卡住：优先确认是否误跑了 `bridge` / `bridge-slow`。
- 测试结束慢：检查 `FAST_TEARDOWN`、`APPIUM_SKIP_LOGCAT_CAPTURE`、`UIAUTOMATOR2_SERVER_READ_TIMEOUT_MS`。

完整排查手册见：[`docs/troubleshooting.md`](docs/troubleshooting.md)。

---

## 6. 文档导航

| 文档 | 说明 |
| --- | --- |
| [`docs/test-strategy.md`](docs/test-strategy.md) | 测试目标、范围、分层、优先级和执行策略 |
| [`docs/test-environment.md`](docs/test-environment.md) | 本地环境、设备、WebView、`.env` 和环境矩阵 |
| [`docs/test-data.md`](docs/test-data.md) | 测试账号池、动态账号、破坏性数据规则 |
| [`docs/reporting-and-quality-gate.md`](docs/reporting-and-quality-gate.md) | 报告结构、失败归因、质量门禁和核心指标 |
| [`docs/ci-plan.md`](docs/ci-plan.md) | CI 分层、设备前提、报告归档和推进步骤 |
| [`docs/troubleshooting.md`](docs/troubleshooting.md) | 常见问题与排查命令 |
| [`docs/quality-system-roadmap.md`](docs/quality-system-roadmap.md) | 自动化测试体系平台化路线图 |
| [`docs/plan/Android_WebView_自动化测试体系改进方案.md`](docs/plan/Android_WebView_自动化测试体系改进方案.md) | 原始改进方案与拆分索引 |
| [`docs/plan/appium-webview-automation-plan.md`](docs/plan/appium-webview-automation-plan.md) | Appium WebView 自动化实现方案 |
| [`docs/plan/webview-h5-automation-tech-stack-summary.md`](docs/plan/webview-h5-automation-tech-stack-summary.md) | WebView/H5 自动化技术栈说明 |
| [`docs/plan/ios-migration-technical-plan.md`](docs/plan/ios-migration-technical-plan.md) | iOS WebView 迁移技术方案 |
