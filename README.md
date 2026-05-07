# Androd_Auto_Test Appium WebView 自动化

第一版自动化脚本基于：

```text
Appium + UiAutomator2 + WebdriverIO + TypeScript + Mocha
```

详细技术方案见：

```text
docs/appium-webview-automation-plan.md
```

> 当前默认按 **Windows + pnpm** 使用方式维护。

---

## 1. 初始化

在 Windows PowerShell 或 CMD 中进入工程目录：

```powershell
cd E:\Androd_Auto_Test\Androd_Auto_Test
```

安装依赖：

```powershell
pnpm install
```

安装 Appium Android 驱动：

```powershell
pnpm appium:install:driver
pnpm appium:driver:list
```

> 本工程将 Appium 扩展目录固定在项目内的 `.appium` 目录。请优先使用上面的 `pnpm appium:*` 脚本，不要直接执行 `pnpm exec appium driver install ...`，避免 Appium 在 pnpm 项目中调用 npm 安装 driver 时出现兼容问题。

生成 `.env`：

```powershell
copy .env.example .env
```

然后编辑：

```text
E:\Androd_Auto_Test\Androd_Auto_Test\.env
```

你主要需要修改这些字段：

```env
ANDROID_DEVICE_NAME=你的设备名
ANDROID_PLATFORM_VERSION=你的 Android 版本
ANDROID_APP_PACKAGE=你的 App 包名
ANDROID_APP_ACTIVITY=你的启动 Activity
TEST_PHONE_A=已完成资料的测试手机号
TEST_PHONE_NEEDS_PROFILE=未完善资料的新账号手机号（可选，但 Profile 首次资料用例需要）
```

> `TEST_PHONE_A` 建议使用 active 状态、已完成个人资料、登录后可直接进入 `/chat` 的账号。否则 Chat、登出、软键盘相关用例可能因为停在 `/profile` 而失败。
>
> `TEST_PHONE_NEEDS_PROFILE` 用于 `CX-PROFILE-003/013/014`。如果不配置且没有开启自动递增，这几个需要“新账号/未完善资料账号”的用例会记录为 `skipped`，不会再用主账号模拟。
>
> 推荐使用自动递增模式：
>
> ```env
> TEST_PHONE_NEEDS_PROFILE=
> TEST_PHONE_NEEDS_PROFILE_AUTO_INCREMENT=true
> TEST_PHONE_NEEDS_PROFILE_BASE=19900010000
> TEST_PHONE_NEEDS_PROFILE_STATE_FILE=.test-state/phone-sequence.json
> ```
>
> 这样每个需要新账号的 Profile 用例执行前会自动分配一个新手机号；首次使用 base，之后每次 +1。状态保存在 `.test-state/phone-sequence.json`，该目录已加入 `.gitignore`。

---

## 2. 前置条件

### 2.1 设备已连接

```powershell
adb devices
```

### 2.2 App 测试包开启 WebView 调试

Android App 测试包需要开启：

```java
WebView.setWebContentsDebuggingEnabled(true);
```

否则 Appium 可能找不到 `WEBVIEW_xxx` context。

### 2.3 Appium 可用

```powershell
pnpm exec appium --version
pnpm appium:driver:list
```

也可以检查环境：

```powershell
pnpm run doctor
```

---

## 3. 启动 Appium

推荐先手动启动 Appium，方便观察日志：

```powershell
pnpm appium
```

然后另开一个 PowerShell/CMD 窗口执行测试。

如果你希望 WebdriverIO 自动启动 Appium，可以在 `.env` 中设置：

```env
START_APPIUM=true
```

第一版调试时建议保持：

```env
START_APPIUM=false
```

---

## 4. 运行测试

### 4.1 Smoke 主套件

```powershell
pnpm test:android:smoke
```

### 4.2 分模块运行

```powershell
pnpm test:android:login
pnpm test:android:auth-state
pnpm test:android:webview
pnpm test:android:navigation
pnpm test:android:reading
pnpm test:android:chat-fast
pnpm test:android:profile-fast
pnpm test:android:account-fast
pnpm test:android:materials-fast
pnpm test:android:medical-fast
pnpm test:android:extended-fast
```

### 4.3 运行所有已实现自动化用例

```powershell
pnpm test:android:all
```

### 4.4 专项重启用例

`CX-WV-BASE-012` 会在 Appium session 内 force-stop 并重新启动 App。这个场景对 Android WebView/Chromedriver 连接比较敏感，所以默认跳过。需要专项验证时在 `.env` 中开启：

```env
RESTART_APP_CASE_ENABLED=true
```

然后建议单独运行：

```powershell
pnpm test:android:webview
```

---

## 4.1 运行前自动 reset App 状态

默认每次执行测试前，框架会在创建 Appium session 前做一次清理：

```powershell
adb -s <device> forward --remove-all
adb -s <device> shell am force-stop <package>
adb -s <device> shell pm clear <package>
adb -s <device> shell am force-stop <package>
```

这样可以清理：

- 上一次残留的 App 主进程和 `:webview` 等子进程；
- 上一次 Chromedriver/Appium 留下的 adb forward；
- App 本地数据、token、localStorage；
- 减少多 WebView/多进程残留导致的 WebView attach 卡住。

相关配置在 `.env`：

```env
RESET_APP_BEFORE_RUN=true
RESET_APP_CLEAR_DATA_BEFORE_RUN=true
RESET_ADB_FORWARDS_BEFORE_RUN=true
RESET_APP_WAIT_MS=2000
```

每次 reset 的命令结果会记录到：

```text
reports/runs/{runId}/pre-run-reset.json
```

---

## 5. 如果测试全部跑完后等待很久

通常这是 Appium/WebdriverIO 在做 session teardown，例如删除 session、停止 Chromedriver/WebView 调试连接、停止 App 或同步报告。

本工程已默认优化：

```env
ANDROID_NO_RESET=true
ANDROID_DONT_STOP_APP_ON_RESET=true
ANDROID_DISABLE_WINDOW_ANIMATION=true
APPIUM_SKIP_LOGCAT_CAPTURE=true
ANDROID_NEW_COMMAND_TIMEOUT_SECONDS=180
UIAUTOMATOR2_SERVER_READ_TIMEOUT_MS=10000
FAST_TEARDOWN=true
POST_RUN_FORCE_STOP_APP=false
WEBDRIVER_CONNECTION_RETRY_TIMEOUT_MS=20000
```

如果你希望 `deleteSession` 卡住时更快失败退出，可以把 `WEBDRIVER_CONNECTION_RETRY_TIMEOUT_MS` 再降到 `10000`。代价是：网络/设备偶发慢时也会更快报超时。

你提供的 Appium 日志显示卡点在删除 UiAutomator2 server session：

```text
Proxying [DELETE /] to http://127.0.0.1:8200/session/...
```

所以当前通过 `UIAUTOMATOR2_SERVER_READ_TIMEOUT_MS=10000` 限制这一步最多等待约 10 秒；同时把 `ANDROID_NEW_COMMAND_TIMEOUT_SECONDS` 恢复到 180，避免 deleteSession 期间触发二次清理。

如果仍然长时间不退出，请查看 Appium 终端最后日志，重点看是否卡在：

```text
DELETE /session
Chromedriver
logcat
```

然后把 Appium 终端最后 30 行日志发出来即可继续定位。

---

## 5. 查看测试结果

每次运行会按时间戳保存：

```text
reports/runs/YYYY-MM-DD_HH-mm-ss/
├─ summary.json
├─ cases.json
├─ environment.json
├─ junit/
├─ allure-results/
└─ artifacts/
```

最近一次运行位置记录在：

```text
reports/runs/latest-run.txt
```

失败用例会保存：

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

---

## 6. 用例覆盖率

```powershell
pnpm cases:coverage
```

输出：

```text
reports/case-coverage.json
reports/runs/{runId}/case-coverage.json
```

---

## 7. 常用辅助命令

查看连接设备：

```powershell
adb devices
```

查看 Android 版本：

```powershell
adb shell getprop ro.build.version.release
```

查看包名：

```powershell
adb shell pm list packages | findstr 关键字
```

查看当前前台 Activity：

```powershell
adb shell dumpsys window | findstr mCurrentFocus
```

---

## 8. 当前已覆盖的用例

当前已实现 **163 / 221** 个 CSV 用例；其中 `webview-h5-test-cases.xlsx` 中 `自动化建议` 严格等于 `是` 的用例已覆盖 **162 / 162**。特殊账号、环境和图片/病历文档输入说明见：

```text
docs/webview-h5-auto-yes-config.md
```

已实现用例清单：

```text
CX-CHAT-001
CX-CHAT-002
CX-CHAT-003
CX-CHAT-004
CX-CHAT-005
CX-CHAT-006
CX-CHAT-007
CX-CHAT-008
CX-CHAT-009
CX-CHAT-010
CX-CHAT-011
CX-CHAT-012
CX-CHAT-013
CX-CHAT-014
CX-CHAT-015
CX-CHAT-016
CX-CHAT-017
CX-CHAT-018
CX-CHAT-019
CX-CHAT-020
CX-CHAT-024
CX-CHAT-025
CX-CHAT-026
CX-CHAT-029
CX-CONSENT-001
CX-CONSENT-002
CX-CONSENT-003
CX-CONSENT-004
CX-CONSENT-006
CX-INPUT-001
CX-INPUT-002
CX-INPUT-003
CX-INPUT-004
CX-INPUT-005
CX-INPUT-006
CX-INPUT-007
CX-INPUT-008
CX-INPUT-009
CX-INPUT-010
CX-INPUT-011
CX-INPUT-012
CX-INPUT-014
CX-MAT-001
CX-MAT-002
CX-MAT-003
CX-MAT-004
CX-MAT-005
CX-MAT-006
CX-MAT-007
CX-MAT-008
CX-MAT-009
CX-MAT-010
CX-MAT-011
CX-MAT-012
CX-MAT-013
CX-MAT-016
CX-MAT-017
CX-MED-001
CX-MED-002
CX-MED-003
CX-MED-004
CX-MED-005
CX-MED-006
CX-MED-007
CX-MED-008
CX-MED-009
CX-MED-010
CX-MED-011
CX-MED-012
CX-MED-013
CX-MED-014
CX-MED-015
CX-MED-016
CX-MED-017
CX-MED-018
CX-MED-019
CX-MED-020
CX-MED-022
CX-MED-026
CX-MED-029
CX-MED-030
CX-MED-031
CX-MED-033
CX-NAV-001
CX-NAV-002
CX-NAV-003
CX-NAV-004
CX-NAV-005
CX-NAV-006
CX-NAV-007
CX-NAV-008
CX-NAV-009
CX-NAV-010
CX-NAV-011
CX-NAV-012
CX-NAV-013
CX-OCR-001
CX-OCR-002
CX-OCR-003
CX-OCR-004
CX-OCR-005
CX-OCR-006
CX-OCR-007
CX-OCR-008
CX-OCR-009
CX-OCR-014
CX-OCR-015
CX-OCR-022
CX-OCR-024
CX-PROFILE-001
CX-PROFILE-002
CX-PROFILE-003
CX-PROFILE-004
CX-PROFILE-005
CX-PROFILE-006
CX-PROFILE-007
CX-PROFILE-008
CX-PROFILE-009
CX-PROFILE-010
CX-PROFILE-011
CX-PROFILE-012
CX-PROFILE-013
CX-PROFILE-014
CX-PROFILE-015
CX-PROFILE-016
CX-READ-001
CX-READ-002
CX-READ-003
CX-READ-004
CX-READ-005
CX-SEC-001
CX-SEC-002
CX-SEC-003
CX-SEC-004
CX-SEC-006
CX-SEC-007
CX-SEC-009
CX-SEC-010
CX-SEC-011
CX-SEC-015
CX-SEC-016
CX-SEC-017
CX-WV-BASE-001
CX-WV-BASE-002
CX-WV-BASE-003
CX-WV-BASE-004
CX-WV-BASE-005
CX-WV-BASE-006
CX-WV-BASE-007
CX-WV-BASE-008
CX-WV-BASE-009
CX-WV-BASE-010
CX-WV-BASE-011
CX-WV-BASE-012
CX-WV-BASE-014
CX-WV-BASE-017
CX-WV-BASE-018
CX-WV-BASE-019
CX-WV-BASE-020
CX-WV-COMPAT-001
CX-WV-COMPAT-002
CX-WV-COMPAT-003
CX-WV-COMPAT-004
```
