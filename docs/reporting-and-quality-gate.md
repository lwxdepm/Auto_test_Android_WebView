# 测试报告、失败归因与质量门禁

本文说明当前报告结构、建议增强字段、失败归因规则、质量门禁和核心指标。

---

## 1. 当前报告结构

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

| 文件/目录 | 作用 |
| --- | --- |
| `summary.json` | 单次运行汇总，包含 total/passed/failed/skipped 等 |
| `cases.json` | 单用例结果、耗时、标签、失败原因和 artifact 位置 |
| `environment.json` | 执行环境摘要 |
| `pre-run-reset.json` | 运行前清理结果 |
| `junit/` | CI 可识别的 JUnit 报告 |
| `allure-results/` | Allure 可视化报告源数据 |
| `artifacts/` | 失败截图、页面源码、错误信息、logcat 等证据 |

---

## 2. `summary.json` 当前口径

当前已包含：

```json
{
  "runId": "2026-05-14_11-14-15",
  "suite": "webview-p0-fast",
  "startedAt": "2026-05-14T03:14:15.373Z",
  "endedAt": "2026-05-14T03:15:29.430Z",
  "total": 10,
  "passed": 10,
  "failed": 0,
  "skipped": 0,
  "failedCases": [],
  "failedCaseDetails": [],
  "skippedCases": [],
  "skippedCaseDetails": []
}
```

建议后续补充：

```json
{
  "passRate": 1,
  "durationMs": 74057,
  "p0PassRate": 1,
  "p1PassRate": 1,
  "blockingDefects": 0,
  "flakyCases": 0,
  "gate": "passed",
  "gateReason": "P0 smoke 10/10 passed"
}
```

---

## 3. `cases.json` 建议增强字段

当前 case 已有 caseId、title、module、priority、status、tags、durationMs、artifactDir 等字段。

建议失败或跳过时补充：

```json
{
  "caseId": "CX-CHAT-021",
  "status": "failed",
  "failureType": "env_error",
  "failureReason": "AI response timeout, backend SSE unstable",
  "isBlocking": false,
  "isFlaky": true,
  "knownIssue": "ISSUE-123",
  "owner": "qa"
}
```

---

## 4. 状态定义

| 状态 | 定义 | 是否计入失败 |
| --- | --- | --- |
| `passed` | 用例执行成功，断言通过 | 否 |
| `failed` | 用例执行完成但断言或流程失败 | 是 |
| `skipped` | 前置条件不满足或配置未开启，主动跳过 | 否，但需要说明原因 |
| `blocked` | 被已知阻塞问题阻断，无法验证目标 | 视门禁规则判断 |
| `flaky` | 偶发失败，重跑可能通过 | 需要单独统计 |

当前 Mocha/WDIO 主要输出 passed/failed/skipped；`blocked` 和 `flaky` 可先作为报告增强字段，不一定立刻改变测试框架状态。

---

## 5. 失败归因分类

| failureType | 含义 | 示例 |
| --- | --- | --- |
| `product_bug` | 产品真实缺陷 | WebView 白屏、登录失败、核心按钮不可用 |
| `script_error` | 脚本定位、等待、断言或测试逻辑问题 | selector 失效、等待条件过短 |
| `env_error` | Appium、设备、网络、后端环境问题 | WebView context 丢失、后端 500、设备离线 |
| `data_error` | 测试账号或前置数据不满足 | 主账号未完成资料、材料数据缺失 |
| `third_party_error` | LLM、SSE、供应商、系统能力等外部依赖异常 | 模型超时、Photo Picker 异常 |
| `flaky` | 偶现不稳定，需要持续观察 | 重跑后通过但原因未明 |

失败归因应尽量基于证据目录、错误信息、页面源码、logcat 和环境信息，不应只凭主观判断。

---

## 6. 质量门禁建议

建议新增 `quality-gate.json` 或 `src/config/quality-gate.ts`：

```json
{
  "smoke-core": {
    "minPassRate": 1.0,
    "blockOnFailedPriority": ["P0"]
  },
  "legacy": {
    "minPassRate": 0.95,
    "blockOnFailedPriority": ["P0", "P1"]
  },
  "business": {
    "minPassRate": 0.85,
    "blockOnFailedPriority": ["P0"],
    "allowExternalDependencyFailure": true
  },
  "bridge": {
    "minPassRate": 0.9,
    "blockOnlyIfReleaseTouchesNativeBridge": true
  }
}
```

执行后在报告中输出：

```json
{
  "gate": "passed",
  "reason": "P0 smoke 10/10 passed, legacy pass rate 98.16%, no blocking P0/P1 failures",
  "blockingCases": []
}
```

失败示例：

```json
{
  "gate": "failed",
  "reason": "P0 case CX-WV-BASE-002 failed: fixed-code login cannot enter Chat",
  "blockingCases": ["CX-WV-BASE-002"]
}
```

---

## 7. `quality-summary.md` 模板

建议每次执行后自动生成面向人的总结：

```markdown
# Android WebView 自动化测试报告

## 1. 测试结论

本次 P0 冒烟通过，核心链路稳定，暂无阻塞问题。

## 2. 执行概况

- Suite: smoke-core
- Total: 10
- Passed: 10
- Failed: 0
- Skipped: 0
- Pass Rate: 100%
- Duration: 3m 21s

## 3. 测试环境

- Device: Xiaomi Mi 12
- Android: 14
- WebView: 124.x
- App: com.cx.agent 1.0.3
- Backend: test

## 4. 失败问题

本次无失败问题。

## 5. 风险说明

- 未覆盖 bridge 原生能力。
- 未覆盖弱网。
- 未覆盖 iOS。

## 6. 发布建议

可继续执行 legacy 快速回归。
```

---

## 8. 核心指标

### 8.1 基础执行指标

| 指标 | 含义 |
| --- | --- |
| `total` | 总用例数 |
| `passed` | 通过数 |
| `failed` | 失败数 |
| `skipped` | 跳过数 |
| `passRate` | 通过率 |
| `durationMs` | 总耗时 |
| `avgCaseDurationMs` | 平均单用例耗时 |

### 8.2 质量指标

| 指标 | 含义 |
| --- | --- |
| `p0PassRate` | P0 用例通过率 |
| `p1PassRate` | P1 用例通过率 |
| `blockingDefects` | 阻塞缺陷数量 |
| `flakyCases` | 不稳定用例数量 |
| `knownIssues` | 已知问题数量 |
| `newFailures` | 新增失败数量 |
| `recoveredCases` | 本次恢复通过的用例数量 |

### 8.3 覆盖指标

| 指标 | 含义 |
| --- | --- |
| `moduleCoverage` | 模块覆盖情况 |
| `automationCoverage` | 自动化覆盖率 |
| `requirementCoverage` | 需求覆盖率 |
| `smokeCoverage` | P0 链路覆盖情况 |
| `bridgeCoverage` | 原生能力覆盖情况 |
| `businessCoverage` | 业务闭环覆盖情况 |

### 8.4 环境指标

| 指标 | 含义 |
| --- | --- |
| `deviceCoverage` | 设备覆盖情况 |
| `androidVersionCoverage` | Android 版本覆盖情况 |
| `webviewVersionCoverage` | WebView 版本覆盖情况 |
| `networkCoverage` | 网络条件覆盖情况 |
| `accountStateCoverage` | 测试账号状态覆盖情况 |
