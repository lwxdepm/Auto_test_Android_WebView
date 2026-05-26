# Android WebView 自动化 CI 集成方案

本文说明 Android WebView Appium 自动化测试如何分阶段接入 CI。

---

## 1. 前提说明

这类测试不是普通单元测试。CI 能否稳定运行，取决于设备和环境是否稳定。

接入前必须具备：

1. CI runner 能访问 Android 真机、模拟器或设备云。
2. CI 能启动 Appium server。
3. CI 能安装或复用 UiAutomator2 driver。
4. 被测 App 是 debug/test 包，并开启 WebView debug。
5. CI 能安全注入 `.env` 所需的测试账号、验证码和包名信息。
6. CI 能归档 `reports/runs/**`、`junit/**`、`allure-results/**`。

---

## 2. CI 分层策略

| 阶段 | 执行内容 | 目的 | 阻塞建议 |
| --- | --- | --- | --- |
| PR 阶段 | `pnpm run typecheck`、可选 `pnpm run doctor` | 快速发现代码和环境问题 | typecheck 阻塞 |
| 提测阶段 | `pnpm run doctor`、`pnpm run test:android:smoke-core` | 快速确认主链路 | P0 失败阻塞 |
| 每日定时 | `pnpm run test:android:legacy` | 日常快速回归 | P0/P1 失败预警或阻塞 |
| 夜间任务 | `business`、`bridge`、`bridge-slow`、必要时 `all` | 业务闭环和原生能力专项 | 结合版本范围判断 |
| 发版前 | `smoke-core`、`legacy`、按改动补跑专项 | 发布质量确认 | 按质量门禁执行 |

---

## 3. 推荐流水线步骤

### 3.1 基础准备

```bash
pnpm install
pnpm run appium:install:driver
pnpm run appium:driver:list
```

### 3.2 注入环境变量

CI 中不要提交真实 `.env`。建议通过 secret 生成：

```bash
cat > .env <<'EOF'
ANDROID_DEVICE_NAME=${ANDROID_DEVICE_NAME}
ANDROID_PLATFORM_VERSION=${ANDROID_PLATFORM_VERSION}
ANDROID_APP_PACKAGE=${ANDROID_APP_PACKAGE}
ANDROID_APP_ACTIVITY=${ANDROID_APP_ACTIVITY}
TEST_PHONE_A=${TEST_PHONE_A}
SMS_FIXED_CODE=${SMS_FIXED_CODE}
START_APPIUM=false
EOF
```

### 3.3 启动 Appium

```bash
pnpm run appium > appium.log 2>&1 &
sleep 5
```

### 3.4 执行检查和测试

```bash
pnpm run doctor
pnpm run test:android:smoke-core
```

每日任务可替换为：

```bash
pnpm run test:android:legacy
```

夜间专项可执行：

```bash
pnpm run test:android:business
pnpm run test:android:bridge
```

---

## 4. 报告归档

CI 应归档：

```text
reports/runs/**
reports/case-coverage.json
appium.log
```

如果 CI 支持 JUnit 测试结果展示，读取：

```text
reports/runs/{runId}/junit/*.xml
```

如果 CI 支持 Allure，读取：

```text
reports/runs/{runId}/allure-results/
```

---

## 5. 失败通知建议

失败通知应包含：

1. 分支、commit、触发人。
2. suite、runId、通过率、失败数、跳过数。
3. gate 结果和 gate reason。
4. P0/P1 失败用例列表。
5. 报告 artifact 链接。
6. Appium 日志链接。

示例：

```text
Android WebView smoke-core failed
Run: 2026-05-14_11-14-15
Gate: failed
Reason: P0 case CX-WV-BASE-002 failed: login cannot enter Chat
Report: <CI artifact link>
```

---

## 6. 分阶段推进计划

### 阶段一：本地稳定后手动触发 CI

- 手动触发 `doctor` + `smoke-core`。
- 只验证一台稳定设备。
- 先不做复杂矩阵。

### 阶段二：每日定时 legacy

- 每日固定时间执行 `legacy`。
- 归档报告。
- 统计最近 7 天通过率和高频失败用例。

### 阶段三：夜间专项

- 夜间执行 `business` 和 `bridge`。
- 专项失败先预警，不立即阻塞普通 H5 发布。

### 阶段四：发版门禁

- 发版前强制执行 `smoke-core` + `legacy`。
- 根据改动范围补跑 `business` 或 `bridge`。
- 质量门禁失败时阻塞发布。

---

## 7. 风险与限制

| 风险 | 处理建议 |
| --- | --- |
| 设备离线 | runner 启动前检查 `adb devices` |
| WebView context 找不到 | 确认测试包开启 WebView debug |
| Chromedriver 不匹配 | 维护 `CHROMEDRIVER_EXECUTABLE_DIR` 或固定设备 WebView 版本 |
| 账号状态污染 | 使用专用账号池和动态递增账号 |
| LLM/后端波动 | business 专项独立统计，不直接污染 smoke/legacy |
| 系统 UI 差异 | bridge/bridge-slow 独立运行，按设备维护兼容策略 |
