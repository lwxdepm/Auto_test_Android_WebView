# Android WebView 自动化测试环境说明

本文说明本地运行环境、`.env` 配置、设备要求、WebView 调试要求和后续环境矩阵建设方向。

---

## 1. 本地基础环境

当前技术栈：

```text
Appium 3 + UiAutomator2 + WebdriverIO + TypeScript + Mocha + pnpm
```

建议本地具备：

| 项 | 要求 |
| --- | --- |
| Node.js | 与项目当前环境一致，建议 Node 20.x |
| pnpm | 与 lockfile 兼容 |
| Android SDK | 可执行 `adb` |
| Appium | 通过项目脚本安装和启动 |
| UiAutomator2 driver | 安装到项目内 `.appium` |
| Android 设备 | 真机或模拟器均可，需能被 `adb devices` 识别 |
| 测试包 | 开启 WebView debug 的 Android 包 |

安装和检查：

```bash
pnpm install
pnpm run appium:install:driver
pnpm run appium:driver:list
pnpm run doctor
```

---

## 2. `.env` 核心配置

`.env.example` 是模板，真实执行前复制为 `.env`：

```bash
cp .env.example .env
```

### 2.1 Appium / ADB

| 变量 | 作用 |
| --- | --- |
| `ADB_PATH` | adb 命令路径，默认 `adb` |
| `APPIUM_HOST` | Appium server 地址，默认 `127.0.0.1` |
| `APPIUM_PORT` | Appium server 端口，默认 `4723` |
| `START_APPIUM` | 是否由 WDIO 自动拉起 Appium；本地调试建议 `false` |

### 2.2 Android 设备

| 变量 | 作用 |
| --- | --- |
| `ANDROID_DEVICE_NAME` | `adb devices` 中看到的设备名 |
| `ANDROID_PLATFORM_VERSION` | 设备 Android 版本；不确定时可留空 |
| `ANDROID_APP_PACKAGE` | 被测 App 包名 |
| `ANDROID_APP_ACTIVITY` | 被测 App 启动 Activity |

检查设备：

```bash
adb devices
adb shell getprop ro.build.version.release
adb shell dumpsys window | grep -E "mCurrentFocus|mFocusedApp"
```

### 2.3 WebView / Chromedriver

| 变量 | 作用 |
| --- | --- |
| `WEBVIEW_CONTEXT_PATTERN` | Appium 查找 WebView context 的关键字 |
| `WEBVIEW_CONTEXT_TIMEOUT_MS` | 等待 WebView context 的超时时间 |
| `CHROMEDRIVER_EXECUTABLE_DIR` | Appium 自动匹配失败时可指定 chromedriver 目录 |

被测包必须开启：

```java
WebView.setWebContentsDebuggingEnabled(true);
```

否则 Appium 可能只能看到 `NATIVE_APP`，无法切换到 `WEBVIEW_xxx`。

### 2.4 运行前清理

| 变量 | 建议值 | 说明 |
| --- | --- | --- |
| `RESET_APP_BEFORE_RUN` | `true` | 每次运行前清理 App 状态 |
| `RESET_APP_CLEAR_DATA_BEFORE_RUN` | `true` | 运行前清 App 数据 |
| `RESET_ADB_FORWARDS_BEFORE_RUN` | `true` | 清理旧 adb forward |
| `RESET_APP_WAIT_MS` | `2000` | 清理后等待时间 |

清理结果保存到：

```text
reports/runs/{runId}/pre-run-reset.json
```

---

## 3. 建议环境矩阵

后续报告中的 `environment.json` 建议逐步扩展这些维度：

| 维度 | 示例 | 价值 |
| --- | --- | --- |
| App 版本 | `1.0.3` / versionCode | 判断问题是否版本相关 |
| H5 版本 | commit hash / build ID | 定位前端构建 |
| 后端环境 | dev / test / staging | 判断依赖环境 |
| Android 系统 | 10 / 11 / 12 / 13 / 14 | 兼容性分析 |
| WebView 版本 | Chrome WebView 版本号 | 定位 WebView 内核差异 |
| 设备类型 | Xiaomi / vivo / OPPO / Huawei / emulator | 定位厂商差异 |
| 网络条件 | 正常 / 弱网 / 断网 | 评估网络稳定性 |
| 账号状态 | 新用户 / 已建档 / 空材料 / 有材料 | 复现数据前置 |

当前 `environment.json` 已包含 runId、node、platform、cwd 和部分 `.env` 摘要；下一步优先补齐 App、H5、backend、device、testData、runner 结构。

---

## 4. 推荐 `environment.json` 目标结构

```json
{
  "runId": "2026-05-14_10-30-22",
  "app": {
    "package": "com.cx.agent",
    "activity": "com.cx.agent.MainActivity",
    "versionName": "1.0.3",
    "versionCode": "103",
    "buildType": "test"
  },
  "h5": {
    "baseUrl": "https://test.example.com",
    "commit": "a1b2c3d",
    "buildTime": "2026-05-14T09:00:00+08:00"
  },
  "backend": {
    "env": "test",
    "apiBaseUrl": "https://api-test.example.com"
  },
  "device": {
    "deviceName": "10AE1Q1ZN8002EU",
    "manufacturer": "Xiaomi",
    "model": "Mi 12",
    "androidVersion": "14",
    "webviewVersion": "124.x"
  },
  "testData": {
    "accountProfile": "profile_done_user",
    "clearDataBeforeRun": true,
    "destructiveCasesEnabled": false
  },
  "runner": {
    "node": "v20.x",
    "pnpm": "9.x",
    "appium": "3.x",
    "webdriverio": "9.x",
    "platform": "macOS"
  }
}
```

---

## 5. CI 环境前提

移动端 Appium 自动化接入 CI 前，需要先确认：

1. CI 机器能访问 Android 设备、模拟器或设备云。
2. CI 能启动 Appium server 并安装 UiAutomator2 driver。
3. 被测 App 是 debug/test 包，开启 WebView debug。
4. CI 有安全注入测试账号、验证码和后端环境变量的能力。
5. 报告目录 `reports/runs/**` 能作为流水线 artifact 保存。

CI 具体方案见：[`ci-plan.md`](ci-plan.md)。
