# Android WebView 自动化测试说明

本项目用于测试 Android WebView 套壳 App，技术栈：

```text
Appium 3 + UiAutomator2 + WebdriverIO + TypeScript + Mocha + pnpm
```

当前脚本支持 **macOS / Windows**。Appium driver 固定安装到项目内 `.appium`，请优先使用本文中的 `pnpm run ...` 命令。

---

## 1. 快速跑通流程

### 1.1 进入项目并安装依赖

macOS：

```bash
cd /Users/liangjiayi/Desktop/ctz/Auto_test_Android_WebView
pnpm install
pnpm run appium:install:driver
pnpm run appium:driver:list
```

Windows PowerShell 示例：

```powershell
cd E:\Androd_Auto_Test\Androd_Auto_Test
pnpm install
pnpm run appium:install:driver
pnpm run appium:driver:list
```

### 1.2 创建并配置 `.env`

macOS：

```bash
cp .env.example .env
code .env
```

Windows：

```powershell
copy .env.example .env
code .env
```

重点检查这些配置：

```env
ANDROID_DEVICE_NAME=127.0.0.1:56696
ANDROID_PLATFORM_VERSION=14
ANDROID_APP_PACKAGE=com.cx.agent
ANDROID_APP_ACTIVITY=com.cx.agent.MainActivity
TEST_PHONE_A=已完成资料的测试手机号
SMS_FIXED_CODE=123
START_APPIUM=false
```

说明：

- `ANDROID_DEVICE_NAME` 填 `adb devices` 看到的设备名。
- `ANDROID_PLATFORM_VERSION` 必须和设备实际 Android 版本一致，也可以留空：`ANDROID_PLATFORM_VERSION=`。
- 如果 Appium 报 `Unable to find an active device or emulator with OS 16`，说明这里或当前终端环境变量还写着 `16`，改成实际版本或执行 `unset ANDROID_PLATFORM_VERSION`。
- `TEST_PHONE_A` 建议使用已完成资料、登录后能直接进入 Chat 的账号。

### 1.3 检查设备和环境

```bash
adb devices
adb shell getprop ro.build.version.release
pnpm run doctor
```

如果 `doctor` 里只有下面这一项失败，一般不影响测试：

```text
App main process pid
```

它只是表示 App 当前没打开，不代表 App 没安装。

### 1.4 启动 Appium

开一个终端，保持运行：

```bash
pnpm run appium
```

再开第二个终端跑测试。

### 1.5 推荐先跑旧的 163 条快速用例

```bash
pnpm run test:android:legacy
```

这是目前最推荐的日常回归命令：**不包含相册、相机、麦克风等原生 bridge 专项**，稳定性最高。

---

## 2. 测试命令怎么区分

| 命令 | 范围 | 是否包含原生能力 | 适合场景 |
| --- | --- | --- | --- |
| `pnpm run test:android:legacy` | 旧版 163 条，`01` 到 `09` specs | 否 | 日常完整快速回归，推荐优先跑 |
| `pnpm run test:android:smoke` | 核心冒烟子集 | 否 | 快速确认主链路是否可用 |
| `pnpm run test:android:extended-fast` | 导航、聊天、个人信息、材料、健康档案等扩展快速用例 | 否 | 不想跑登录/基础 WebView 时使用 |
| `pnpm run test:android:bridge` | 原生化专项 4 条 | 是 | 验证相册 file chooser、麦克风权限、录音、复制后输入 |
| `pnpm run test:android:bridge-slow` | 相机 capture 1 条 | 是 | 单独验证原生相机拍照回填 |
| `pnpm run test:android:all` | 当前所有已实现用例，约 168 条 | 是 | 全量验证；会包含 bridge 和 camera，可能受设备系统 UI 影响 |

结论：

- **只想跑之前那套方便快速的 163 条：**

  ```bash
  pnpm run test:android:legacy
  ```

- **想验证套壳 App 是否更像原生 App：**

  ```bash
  pnpm run test:android:bridge
  pnpm run test:android:bridge-slow
  ```

- **不要误用 `all` 做日常快速回归**，因为它会把原生专项也跑进去。

---

## 3. 分模块运行

```bash
pnpm run test:android:login
pnpm run test:android:auth-state
pnpm run test:android:webview
pnpm run test:android:navigation
pnpm run test:android:reading
pnpm run test:android:chat-fast
pnpm run test:android:profile-fast
pnpm run test:android:account-fast
pnpm run test:android:materials-fast
pnpm run test:android:medical-fast
```

只跑某条 case，可以用 `grep`：

```bash
pnpm exec wdio run wdio.android.conf.ts --suite legacy --mochaOpts.grep "CX-CHAT-001"
```

---

## 4. 查看测试结果

每次运行会生成一个时间戳目录：

```text
reports/runs/YYYY-MM-DD_HH-mm-ss/
├─ summary.json
├─ cases.json
├─ environment.json
├─ junit/
├─ allure-results/
└─ artifacts/
```

查看最近一次运行结果：

```bash
cd /Users/liangjiayi/Desktop/ctz/Auto_test_Android_WebView
RUN_ID=$(head -n 1 reports/runs/latest-run.txt)
cat "reports/runs/$RUN_ID/summary.json"
```

在 Finder 中打开最近一次报告目录：

```bash
RUN_DIR=$(sed -n '2p' reports/runs/latest-run.txt)
open "$RUN_DIR"
```

失败用例的截图、页面源码、错误信息会放在：

```text
reports/runs/{runId}/artifacts/{caseId}/
```

---

## 5. 运行前自动清理

默认每次运行前会自动执行：

```text
adb forward --remove-all
adb shell am force-stop <package>
adb shell pm clear <package>
adb shell am force-stop <package>
```

相关配置在 `.env`：

```env
RESET_APP_BEFORE_RUN=true
RESET_APP_CLEAR_DATA_BEFORE_RUN=true
RESET_ADB_FORWARDS_BEFORE_RUN=true
RESET_APP_WAIT_MS=2000
```

清理日志保存到：

```text
reports/runs/{runId}/pre-run-reset.json
```

---

## 6. 常见问题

### 6.1 Android 版本不匹配

报错类似：

```text
Unable to find an active device or emulator with OS 16. The following are available: xxx (14)
```

处理：

```bash
adb shell getprop ro.build.version.release
```

然后把 `.env` 改成实际版本，或留空：

```env
ANDROID_PLATFORM_VERSION=
```

如果当前终端设置过旧变量：

```bash
unset ANDROID_PLATFORM_VERSION
```

### 6.2 找不到 WebView context

App 测试包需要开启 WebView 调试：

```java
WebView.setWebContentsDebuggingEnabled(true);
```

否则 Appium 可能找不到 `WEBVIEW_xxx`。

### 6.3 相册/相机选择卡住

这是 `bridge` / `bridge-slow` 原生专项才会遇到的问题，常见于 vivo、部分 Android 版本的系统 Photo Picker。日常回归请先使用：

```bash
pnpm run test:android:legacy
```

### 6.4 测试跑完后退出慢

可检查 `.env` 中这些配置：

```env
FAST_TEARDOWN=true
APPIUM_SKIP_LOGCAT_CAPTURE=true
UIAUTOMATOR2_SERVER_READ_TIMEOUT_MS=10000
WEBDRIVER_CONNECTION_RETRY_TIMEOUT_MS=20000
```

如果仍然卡住，把 Appium 终端最后 30 行日志发出来定位。

---

## 7. 覆盖率统计

```bash
pnpm run cases:coverage
```

输出：

```text
reports/case-coverage.json
```

当前大致情况：

```text
legacy: 旧版快速用例 163 条
bridge: 原生化专项 4 条
bridge-slow: 相机专项 1 条
all: 约 168 条
```

---

## 8. 常用 adb 命令

```bash
adb devices
adb shell getprop ro.build.version.release
adb shell pm path com.cx.agent
adb shell pidof com.cx.agent
adb shell am force-stop com.cx.agent
adb shell input keyevent BACK
```

查看当前前台页面：

```bash
adb shell dumpsys window | grep -E "mCurrentFocus|mFocusedApp"
```

---

## 9. 相关文档

```text
docs/appium-webview-automation-plan.md
docs/webview-h5-auto-yes-config.md
reports/case-coverage.json
```
