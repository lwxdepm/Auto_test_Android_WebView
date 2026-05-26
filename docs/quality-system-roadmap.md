# Android WebView 自动化测试体系路线图

本文是从“自动化测试脚本工程”升级到“质量保障闭环”的推进路线。

---

## 1. 当前状态

当前项目已经具备较好的自动化基础：

- Appium 3 + UiAutomator2 + WebdriverIO + TypeScript + Mocha + pnpm。
- P0 冒烟、legacy 快速回归、extended 快速用例、bridge 原生专项、business 业务闭环专项。
- 每次执行生成 `summary.json`、`cases.json`、`environment.json`、JUnit、Allure 和 artifacts。
- 当前约 181 个唯一自动化用例，其中 legacy 163 条、business 13 条、bridge 4 条、bridge-slow 1 条。

主要缺口：

1. 测试策略和文档体系需要完善。
2. `environment.json` 缺少完整环境矩阵。
3. 测试账号池和数据管理需要明确规则。
4. 缺少可执行的质量门禁。
5. 失败原因还需要结构化归因。
6. 缺少跨运行趋势统计。
7. CI 还未形成稳定流水线。

---

## 2. 五层架构目标

```text
1. 测试资产层
2. 测试执行层
3. 环境与数据层
4. 报告与证据层
5. 质量门禁层
```

| 层级 | 目标 | 当前基础 | 下一步 |
| --- | --- | --- | --- |
| 测试资产层 | 用例可管理、可追踪、可统计 | CSV + case-manifest + specs | 统一元数据口径，避免多事实源 |
| 测试执行层 | 执行命令标准化 | npm scripts + wdio suites | 固定提测/回归/专项执行策略 |
| 环境与数据层 | 结果可复现 | `.env` + `environment.json` | 扩展 App/H5/设备/账号矩阵 |
| 报告与证据层 | 机器可解析、人可阅读 | JSON + JUnit + Allure + artifacts | 新增 `quality-summary.md` |
| 质量门禁层 | 结果可判断是否发布 | 目前仅有 pass/fail | 新增 gate 规则和阻塞判断 |

---

## 3. 优先级路线

### 第一优先级：增强 `environment.json`

目标：每次测试结果都能说明：

```text
谁测的？什么时候测的？测的哪个 App？哪个 H5 版本？哪个后端环境？
哪个设备？哪个 Android 版本？哪个 WebView 版本？用了什么测试账号？执行了哪个 suite？
```

验收标准：

- `environment.json` 包含 app、h5、backend、device、testData、runner。
- 报告中敏感账号信息脱敏。
- 失败问题能根据环境信息复现。

### 第二优先级：新增 `quality-summary.md`

目标：每次测试结束自动输出人能看懂的总结。

验收标准：

- 包含测试结论、执行概况、测试环境、失败问题、风险说明、发布建议。
- 可直接用于日报、周报、发版评审或面试展示。

### 第三优先级：失败原因分类

目标：让失败不仅是 failed，还能说明为什么失败。

建议字段：

```json
{
  "failureType": "env_error",
  "failureReason": "AI response timeout, backend SSE unstable",
  "isBlocking": false,
  "isFlaky": true
}
```

验收标准：

- P0/P1 失败必须有 failureType。
- skipped 必须有 skipped reason。
- 可统计 product_bug、script_error、env_error、data_error、third_party_error、flaky。

### 第四优先级：建立测试账号池文档

已拆分为：[`test-data.md`](test-data.md)。

验收标准：

- 主账号、动态账号、破坏性账号职责清晰。
- `.env.example` 只保留占位值。
- 破坏性用例不使用主冒烟账号。

### 第五优先级：定义质量门禁规则

目标：将测试结果转化为是否允许合并/发布。

建议输出：

```text
Gate: Passed / Failed
Reason: 具体原因
Blocking Cases: 阻塞用例列表
```

验收标准：

- `smoke-core` P0 失败阻塞。
- `legacy` P0/P1 失败按规则阻塞。
- `business` / `bridge` 按版本改动范围判断。

### 第六优先级：接入 CI

目标：从手动执行变为稳定流水线。

推进顺序：

```text
手动触发 smoke-core
→ 每日 legacy
→ 夜间 business + bridge
→ 发版前 smoke-core + legacy + 相关专项
```

验收标准：

- CI 能归档报告和日志。
- 失败通知包含 gate reason 和报告链接。
- 移动设备/模拟器资源稳定。

---

## 4. 文档拆分结果

| 文档 | 作用 |
| --- | --- |
| [`test-strategy.md`](test-strategy.md) | 测试目标、范围、分层、优先级、执行策略 |
| [`test-environment.md`](test-environment.md) | 本地环境、设备、WebView、环境矩阵 |
| [`test-data.md`](test-data.md) | 测试账号池、动态账号、破坏性数据规则 |
| [`reporting-and-quality-gate.md`](reporting-and-quality-gate.md) | 报告结构、失败归因、质量门禁、指标体系 |
| [`ci-plan.md`](ci-plan.md) | CI 分层、设备前提、报告归档 |
| [`troubleshooting.md`](troubleshooting.md) | 常见问题排查 |

原始方案保留在：[`plan/Android_WebView_自动化测试体系改进方案.md`](plan/Android_WebView_自动化测试体系改进方案.md)。

---

## 5. 汇报表达

可以这样介绍当前工作：

```text
我目前负责 Android WebView 套壳 App 的自动化测试体系建设。
现阶段已经基于 Appium 3、UiAutomator2、WebdriverIO、TypeScript 和 Mocha 搭建了自动化测试工程，
并按照测试风险将用例分为 P0 冒烟、legacy 快速回归、extended 扩展回归、bridge 原生能力专项、business 业务闭环专项和 all 全量测试。

下一步会把它从脚本工程升级为测试平台能力，重点补齐环境矩阵、测试账号池、质量门禁、失败归因、趋势统计和 CI 集成，
使测试结果不仅能说明用例是否通过，还能说明在什么环境下通过、失败原因是什么、是否阻塞发布、有哪些风险需要关注。
```

---

## 6. 最终展示目标

不要只展示“写了多少脚本”，而是展示完整质量保障能力：

```text
测试策略
→ 环境管理
→ 用例管理
→ 自动执行
→ 报告产出
→ 失败归因
→ 发布门禁
→ 趋势分析
→ 持续改进
```
