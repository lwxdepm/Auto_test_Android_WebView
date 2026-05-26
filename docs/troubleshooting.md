# Android WebView 自动化常见问题排查

本文记录本项目常见失败原因、判断方式和处理建议。

---

## 1. Android 版本不匹配

报错示例：

```text
Unable to find an active device or emulator with OS 16. The following are available: xxx (14)
```

排查：

```bash
adb devices
adb shell getprop ro.build.version.release
```

处理：

```env
ANDROID_PLATFORM_VERSION=14
```

或者不指定版本：

```env
ANDROID_PLATFORM_VERSION=
```

如果当前终端曾经导出过旧变量：

```bash
unset ANDROID_PLATFORM_VERSION
```

---

## 2. 找不到 WebView context

现象：Appium 只看到 `NATIVE_APP`，无法切换到 `WEBVIEW_xxx`。

常见原因：

1. 被测包没有开启 WebView debug。
2. WebView 页面尚未加载完成。
3. Chromedriver 与 WebView 内核不兼容。
4. 设备或 Appium session 状态异常。

处理：

```java
WebView.setWebContentsDebuggingEnabled(true);
```

然后重新执行：

```bash
pnpm run doctor
pnpm run test:android:smoke-core
```

---

## 3. Chromedriver 与 WebView 版本不匹配

现象：可以看到 WebView context，但切换或操作 DOM 失败。

排查 WebView 版本：

```bash
adb shell dumpsys package com.google.android.webview | grep versionName
adb shell dumpsys package com.android.chrome | grep versionName
```

处理：

1. 优先使用 Appium 自动匹配。
2. 如果自动匹配失败，下载对应 chromedriver。
3. 在 `.env` 指定：

```env
CHROMEDRIVER_EXECUTABLE_DIR=/path/to/chromedrivers
```

---

## 4. Appium driver 未安装

报错可能包含 `uiautomator2` driver not found。

处理：

```bash
pnpm run appium:install:driver
pnpm run appium:driver:list
```

本项目通过 `scripts/with-appium-home.cjs` 将 driver 安装到项目内 `.appium`，不要直接依赖全局 Appium 状态。

---

## 5. Chat 页面未加载完成

常见失败：

```text
Chat 页面未加载完成。请确认 TEST_PHONE_A 是已完成资料的 active 账号。
```

优先排查：

1. `TEST_PHONE_A` 是否能用固定验证码登录。
2. 该账号是否已完成个人资料。
3. 登录后是否直接进入 `/chat`，而不是 `/profile`。
4. 后端环境是否可用。
5. 运行前是否清除了 App 数据，导致需要重新登录。

建议先单跑：

```bash
pnpm exec wdio run wdio.android.conf.ts --suite smokeCore --mochaOpts.grep "CX-WV-BASE-002"
```

---

## 6. 用例被 skipped

skipped 不一定代表产品失败。常见原因：

| 原因 | 示例 |
| --- | --- |
| 缺少专用账号 | 未配置 `TEST_PHONE_MEDICAL_PURGE` |
| 破坏性用例未启用 | 不允许清档或注销 |
| 动态账号分配失败 | base 手机号不符合格式 |
| 前置数据不可用 | 没有材料、没有沟通卡、没有健康授权状态 |

处理：查看 `cases.json` 中的 `skippedCaseDetails`，按缺失的变量或数据补齐。

---

## 7. 相册/相机选择卡住

这类问题一般只出现在：

```bash
pnpm run test:android:bridge
pnpm run test:android:bridge-slow
```

原因通常是系统 Photo Picker、相机 App、权限弹窗或不同厂商系统 UI 差异。

处理建议：

1. 日常快速回归不要跑 `bridge` / `bridge-slow`。
2. bridge 专项使用固定设备和系统版本。
3. 失败时保留截图、page source 和 logcat。
4. 必要时为特定厂商设备增加兼容选择器。

---

## 8. 测试结束后退出慢

检查 `.env`：

```env
FAST_TEARDOWN=true
APPIUM_SKIP_LOGCAT_CAPTURE=true
UIAUTOMATOR2_SERVER_READ_TIMEOUT_MS=10000
WEBDRIVER_CONNECTION_RETRY_TIMEOUT_MS=20000
POST_RUN_FORCE_STOP_APP=false
```

如果仍然卡住，保存 Appium 终端最后 30 行日志，并查看：

```text
reports/runs/{runId}/pre-run-reset.json
reports/runs/{runId}/artifacts/
```

---

## 9. 动态手机号重复或异常

动态账号状态文件：

```text
.test-state/phone-sequence.json
```

如果重复分配，检查：

1. 是否从不同工作目录启动，导致状态文件写到不同位置。
2. `TEST_PHONE_NEEDS_PROFILE_STATE_FILE` 是否被改成其他路径。
3. base 手机号是否被重置。

通常不要删除状态文件；确需重置时，应确认旧号段不会再影响测试。

---

## 10. 常用诊断命令

```bash
adb devices
adb shell getprop ro.build.version.release
adb shell pm path com.cx.agent
adb shell pidof com.cx.agent
adb shell am force-stop com.cx.agent
adb shell input keyevent BACK
adb shell dumpsys window | grep -E "mCurrentFocus|mFocusedApp"
pnpm run doctor
```

查看最新报告：

```bash
RUN_ID=$(head -n 1 reports/runs/latest-run.txt)
cat "reports/runs/$RUN_ID/summary.json"
```
