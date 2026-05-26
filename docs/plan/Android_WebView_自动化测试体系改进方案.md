# Android WebView 自动化测试体系改进方案

> 适用场景：Android WebView 套壳 App 自动化测试、H5 移动端兼容性测试、Appium/WebdriverIO 自动化回归体系建设。  
> 目标：将现有“自动化测试脚本工程”升级为“可复现、可追踪、可度量、可汇报、可接入 CI 的系统性测试流程 / 测试平台”。


## 文档拆分状态

本文保留为“总方案 / 原始路线图”。为方便日常维护和查阅，已将可执行内容拆分为以下文档：

| 文档 | 说明 |
|---|---|
| [`../test-strategy.md`](../test-strategy.md) | 测试目标、范围、分层、优先级和执行策略 |
| [`../test-environment.md`](../test-environment.md) | 本地环境、设备、WebView、`.env` 和环境矩阵 |
| [`../test-data.md`](../test-data.md) | 测试账号池、动态账号、破坏性数据规则 |
| [`../reporting-and-quality-gate.md`](../reporting-and-quality-gate.md) | 报告结构、失败归因、质量门禁和核心指标 |
| [`../ci-plan.md`](../ci-plan.md) | CI 分层、设备前提、报告归档和推进步骤 |
| [`../troubleshooting.md`](../troubleshooting.md) | 常见问题与排查命令 |
| [`../quality-system-roadmap.md`](../quality-system-roadmap.md) | 平台化建设路线图和汇报表达 |

README 已简化为快速开始、常用命令、报告位置和文档导航；详细规范以后优先维护上述拆分文档。

---

## 1. 当前已有基础评估

从现有 README 来看，当前项目已经不是从 0 开始，而是已经具备了较好的自动化测试工程基础。

### 1.1 已有技术栈

当前项目用于测试 Android WebView 套壳 App，技术栈为：

```text
Appium 3 + UiAutomator2 + WebdriverIO + TypeScript + Mocha + pnpm
```

这些技术组合说明项目已经具备了移动端自动化测试的基本能力：

| 技术 | 作用 |
|---|---|
| Appium 3 | 移动端自动化测试框架 |
| UiAutomator2 | Android 原生控件自动化驱动 |
| WebdriverIO | 测试脚本执行框架 |
| TypeScript | 编写结构化、可维护的测试代码 |
| Mocha | 测试用例组织与执行框架 |
| pnpm | 包管理和脚本运行工具 |

---

### 1.2 已有测试套件分层

当前项目已经区分了多种测试命令：

| 命令 | 作用 |
|---|---|
| `test:android:smoke-core` | P0 冒烟主链路测试 |
| `test:android:legacy` | 旧版 163 条快速回归 |
| `test:android:extended-fast` | 扩展快速用例 |
| `test:android:bridge` | 原生能力专项测试 |
| `test:android:bridge-slow` | 相机专项测试 |
| `test:android:business` | 业务闭环专项测试 |
| `test:android:all` | 全量测试 |

这说明项目已经有了初步的测试分层意识，而不是简单地把所有脚本混在一起执行。

---

### 1.3 已有结果记录能力

当前每次运行会生成：

```text
reports/runs/YYYY-MM-DD_HH-mm-ss/
├─ summary.json
├─ cases.json
├─ environment.json
├─ junit/
├─ allure-results/
└─ artifacts/
```

这说明项目已经具备了：

- 结构化测试结果记录；
- JUnit 报告能力；
- Allure 可视化报告能力；
- 失败截图、页面源码、错误信息等证据留存能力；
- 每次执行结果按时间戳目录归档的能力。

这些都是专业自动化测试体系的重要基础。

---

## 2. 当前主要问题

虽然目前已经有自动化脚本和测试报告，但整体上仍然更像一个“自动化测试脚本工程”，还没有完全升级为“系统性测试平台 / 测试流程体系”。

主要缺口如下。

---

### 2.1 缺少测试策略文档

目前 README 主要说明“怎么跑脚本”，但还没有系统解释：

- 为什么要分这些测试套件？
- 每个测试套件解决什么质量问题？
- 哪些用例是 P0、P1、P2？
- 哪些测试适合每次提测跑？
- 哪些测试适合每日回归？
- 哪些测试适合夜间任务？
- 哪些失败会阻塞发布？
- 哪些失败只记录风险，不阻塞发布？

专业测试体系不能只告诉别人“怎么运行命令”，还要说明“为什么这样测”和“测完之后如何判断质量”。

---

### 2.2 缺少完整环境矩阵

当前 `.env` 已经可以配置设备名、Android 版本、App 包名、Activity 和测试账号，但还需要进一步抽象为完整测试环境矩阵。

建议管理这些维度：

| 维度 | 示例 |
|---|---|
| App 版本 | `1.0.3` / `1.0.4` |
| H5 版本 | commit hash / build ID |
| 后端环境 | dev / test / staging |
| Android 系统 | Android 10 / 11 / 12 / 13 / 14 |
| WebView 版本 | Chrome WebView 版本号 |
| 设备类型 | 小米 / vivo / OPPO / 华为 / 模拟器 |
| 网络条件 | 正常网络 / 弱网 / 断网 |
| 账号状态 | 新用户 / 老用户 / 已建档用户 / 空材料用户 / 有材料用户 |

如果测试报告中没有记录这些信息，就很难说明“这个通过率是在什么条件下得到的”。

---

### 2.3 缺少测试数据管理体系

README 中已经出现了类似：

```text
TEST_PHONE_A
TEST_PHONE_NEEDS_PROFILE
TEST_PHONE_MEDICAL_PURGE
```

这说明项目已经意识到不同测试账号状态的重要性。

但如果要更加专业，建议建立明确的测试账号池：

| 账号类型 | 用途 | 是否允许破坏性操作 |
|---|---|---|
| smoke_user | 冒烟测试主流程账号 | 否 |
| new_user | 新用户建档流程测试 | 是 |
| profile_done_user | 已完成资料用户测试 | 否 |
| material_empty_user | 空材料状态测试 | 可选 |
| material_full_user | 有材料状态测试 | 否 |
| destructive_user | 清档、删除、重置类测试 | 是 |
| business_user | Agent / LLM 业务闭环测试 | 否 |

很多自动化测试失败不是脚本问题，而是测试账号状态不稳定。因此，测试数据管理是平台化建设中的重点。

---

### 2.4 缺少质量门禁标准

目前脚本能跑，但还需要定义“什么结果算通过，什么结果会阻塞发布”。

例如：

```text
P0 冒烟通过率必须 100%
P1 核心用例通过率 >= 95%
不允许存在 P0/P1 阻塞缺陷
WebView 白屏、登录失败、核心 Chat 不可用，直接阻塞发布
bridge 专项失败不一定阻塞普通 H5 发布，但需要记录原生能力风险
business LLM 专项失败不一定阻塞前端基础发布，但需要标注后端/模型链路风险
```

这样测试结果才能从“脚本执行结果”升级为“发布质量判断依据”。

---

### 2.5 缺少失败归因体系

专业测试平台不仅要知道“失败了”，还要知道“为什么失败”。

建议对失败原因进行分类：

| failureType | 含义 |
|---|---|
| product_bug | 产品真实缺陷 |
| script_error | 脚本定位、等待、断言问题 |
| env_error | Appium、设备、网络、后端环境问题 |
| data_error | 测试账号状态不符合前置条件 |
| third_party_error | LLM、SSE、供应商接口、微信能力等外部依赖异常 |
| flaky | 偶现不稳定，需要持续观察 |

这比单纯的 Pass / Fail 更有分析价值。

---

### 2.6 缺少趋势统计

当前已有单次运行的 `summary.json`，但还需要做长期趋势分析：

- 最近 7 天通过率变化；
- 哪些用例失败次数最多；
- 哪些模块最不稳定；
- 平均执行耗时是否变长；
- P0 冒烟是否连续稳定；
- 新增用例数量；
- 自动化覆盖率变化；
- flaky 用例数量变化。

趋势统计可以让你从“测试执行者”变成“质量分析者”。

---

## 3. 推荐的测试平台五层架构

建议将现有工程升级为五层结构。

```text
1. 测试资产层
2. 测试执行层
3. 环境与数据层
4. 报告与证据层
5. 质量门禁层
```

---

## 4. 第一层：测试资产层

目标：让所有测试用例可管理、可追踪、可统计。

建议为每条测试用例建立标准化 schema。

示例：

```json
{
  "caseId": "CX-CHAT-004",
  "title": "可发送一条普通文字消息",
  "module": "chat",
  "priority": "P0",
  "suite": ["smoke-core", "legacy"],
  "type": "functional",
  "automation": true,
  "destructive": false,
  "requires": ["login", "webview"],
  "owner": "qa",
  "status": "active",
  "risk": "核心聊天链路不可用会影响主功能",
  "precondition": "测试账号已登录或可登录",
  "expected": "消息发送成功，用户消息和 AI 回复正常展示"
}
```

建议新增目录：

```text
cases/
├─ cases.registry.json
├─ modules/
│  ├─ login.json
│  ├─ chat.json
│  ├─ navigation.json
│  ├─ materials.json
│  ├─ medical.json
│  └─ bridge.json
└─ coverage-map.json
```

这样可以对外说明：

```text
当前维护约 181 条自动化用例：
- P0 冒烟：10 条
- legacy 快速回归：163 条
- business 业务闭环专项：13 条
- bridge 原生能力专项：4 条
- bridge-slow 相机专项：1 条
```

用例按照模块、优先级、风险等级、是否原生能力、是否破坏性进行管理。

---

## 5. 第二层：测试执行层

目标：让测试执行方式标准化，不依赖个人记忆命令。

建议将执行模式固定为：

| 执行模式 | 命令 | 使用场景 | 是否作为门禁 |
|---|---|---|---|
| precheck | `pnpm run doctor` | 环境检查 | 是 |
| smoke | `pnpm run test:android:smoke-core` | 提测 / 发版前 | 是 |
| regression | `pnpm run test:android:legacy` | 日常快速回归 | 是 |
| extended | `pnpm run test:android:extended-fast` | 扩展功能验证 | 否 |
| bridge | `pnpm run test:android:bridge` | 原生能力专项 | 视版本而定 |
| business | `pnpm run test:android:business` | Agent / LLM 业务闭环 | 专项 / 夜间 |
| full | `pnpm run test:android:all` | 全量验证 | 不建议日常跑 |

建议明确执行策略：

```text
1. 每次提测前：先跑 doctor，再跑 smoke-core。
2. smoke-core 通过后：再跑 legacy 快速回归。
3. 如果本次版本涉及相册、相机、麦克风、复制粘贴等原生能力：补跑 bridge / bridge-slow。
4. 如果本次版本涉及 Agent、模型、SSE、材料、健康档案等业务闭环：补跑 business。
5. all 不作为日常快速回归命令，只在发版前或夜间全量任务中使用。
```

---

## 6. 第三层：环境与数据层

目标：让每次测试结果都能回答：

> 本次测试是在什么 App 版本、什么 H5 版本、什么后端环境、什么设备、什么 WebView 版本、什么账号状态下完成的？

建议增强 `environment.json`。

示例：

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
    "baseUrl": "https://test.xxx.com",
    "commit": "a1b2c3d",
    "buildTime": "2026-05-14T09:00:00+08:00"
  },
  "backend": {
    "env": "test",
    "apiBaseUrl": "https://api-test.xxx.com"
  },
  "device": {
    "deviceName": "127.0.0.1:56696",
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
    "webdriverio": "x.x",
    "platform": "macOS"
  }
}
```

专业测试报告应能够表述为：

```text
在 Android 14 / Xiaomi Mi 12 / WebView 124 / App 1.0.3 / test 后端环境下，
P0 冒烟 10/10 通过，legacy 160/163 通过。
3 个失败中 2 个为已知环境波动，1 个为文案断言变更，未发现阻塞发布问题。
```

---

## 7. 第四层：报告与证据层

目标：让测试报告既适合机器解析，也适合人阅读。

当前已有：

```text
summary.json
cases.json
environment.json
junit/
allure-results/
artifacts/
```

建议新增自动生成的人类可读报告：

```text
quality-summary.md
```

示例结构：

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

如果存在失败，应展示：

```text
失败用例：
1. CX-MAT-008
   - 模块：材料
   - 优先级：P1
   - 失败类型：product_bug / script_error / env_error
   - 失败原因：材料页空态文案断言失败
   - 是否阻塞：否
   - 证据目录：reports/runs/{runId}/artifacts/CX-MAT-008/
```

---

## 8. 第五层：质量门禁层

目标：将测试结果转化为“是否允许合并 / 是否允许发布”的判断。

建议新增 `quality-gate.json`。

示例：

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

执行后生成门禁结果：

```json
{
  "gate": "passed",
  "reason": "P0 smoke 10/10 passed, legacy pass rate 98.16%, no blocking P0/P1 failures"
}
```

如果不通过：

```json
{
  "gate": "failed",
  "reason": "P0 case CX-WV-BASE-002 failed: fixed-code login cannot enter Chat"
}
```

这样测试体系就不只是“报告结果”，而是能参与发布决策。

---

## 9. 建议新增的核心指标

### 9.1 基础执行指标

| 指标 | 含义 |
|---|---|
| total | 总用例数 |
| passed | 通过数 |
| failed | 失败数 |
| skipped | 跳过数 |
| blocked | 阻塞数 |
| passRate | 通过率 |
| duration | 总耗时 |
| avgCaseDuration | 平均单用例耗时 |

---

### 9.2 质量指标

| 指标 | 含义 |
|---|---|
| p0PassRate | P0 用例通过率 |
| p1PassRate | P1 用例通过率 |
| blockingDefects | 阻塞缺陷数量 |
| flakyCases | 不稳定用例数量 |
| knownIssues | 已知问题数量 |
| newFailures | 新增失败数量 |
| recoveredCases | 本次恢复通过的用例数量 |

---

### 9.3 覆盖指标

| 指标 | 含义 |
|---|---|
| moduleCoverage | 模块覆盖率 |
| automationCoverage | 自动化覆盖率 |
| requirementCoverage | 需求覆盖率 |
| smokeCoverage | P0 链路覆盖率 |
| bridgeCoverage | 原生能力覆盖率 |
| businessCoverage | 业务闭环覆盖率 |

---

### 9.4 环境指标

| 指标 | 含义 |
|---|---|
| deviceCoverage | 设备覆盖情况 |
| androidVersionCoverage | Android 版本覆盖情况 |
| webviewVersionCoverage | WebView 版本覆盖情况 |
| networkCoverage | 网络条件覆盖情况 |
| accountStateCoverage | 测试账号状态覆盖情况 |

---

## 10. 建议新增的文档结构

建议将当前 README 拆分为多份文档，避免 README 过长。

```text
docs/
├─ test-strategy.md
├─ test-environment.md
├─ test-data.md
├─ reporting-and-quality-gate.md
├─ ci-plan.md
└─ troubleshooting.md
```

---

### 10.1 README.md

README 只保留快速使用信息：

```text
1. 项目简介
2. 技术栈
3. 快速开始
4. 常用命令
5. 报告位置
6. 常见问题入口
```

---

### 10.2 docs/test-strategy.md

用于说明整体测试策略：

```text
1. 测试目标
2. 测试范围
3. 不在测试范围
4. 测试分层
   - P0 冒烟
   - 快速回归
   - 扩展回归
   - 原生能力专项
   - 业务闭环专项
   - 全量测试
5. 用例优先级定义
6. 质量门禁标准
7. 失败归因规则
8. 发布建议规则
```

---

### 10.3 docs/test-environment.md

用于说明环境配置：

```text
1. 本地执行环境
2. Appium / UiAutomator2 / WebdriverIO 版本
3. Android 设备要求
4. WebView 调试要求
5. 测试账号要求
6. 后端环境要求
7. 原生 bridge 权限要求
8. 环境检查命令
```

---

### 10.4 docs/test-data.md

用于说明测试数据和账号池：

```text
1. 测试账号分类
2. 账号使用规则
3. 破坏性账号管理
4. 新用户账号管理
5. 业务闭环账号管理
6. 测试前数据检查
7. 测试后数据恢复
```

---

### 10.5 docs/reporting-and-quality-gate.md

用于说明报告和门禁：

```text
1. summary.json 字段说明
2. cases.json 字段说明
3. environment.json 字段说明
4. artifacts 目录说明
5. JUnit 用途
6. Allure 用途
7. 通过率计算方式
8. skipped / blocked / failed 区别
9. 发布门禁规则
10. 失败问题如何归因
```

---

### 10.6 docs/ci-plan.md

用于说明 CI 集成方案：

```text
1. PR 阶段执行什么
2. 每日定时执行什么
3. 夜间任务执行什么
4. 发版前执行什么
5. 失败后如何通知
6. 报告如何归档
```

---

## 11. CI 集成建议

当本地脚本稳定后，建议接入 CI，例如 GitHub Actions、GitLab CI、Jenkins 或公司内部流水线。

建议 CI 分层：

| 阶段 | 执行内容 | 目的 |
|---|---|---|
| PR 阶段 | lint、typecheck、smoke-core | 快速发现基础问题 |
| 每日定时 | legacy、extended-fast | 日常回归 |
| 夜间任务 | business、bridge、all | 更完整验证 |
| 发版前 | smoke-core、legacy、按改动选择 bridge/business | 发布门禁 |

示例策略：

```text
PR 阶段：
- pnpm install
- pnpm run doctor
- pnpm run test:android:smoke-core

每日回归：
- pnpm run test:android:legacy
- pnpm run test:android:extended-fast

夜间专项：
- pnpm run test:android:business
- pnpm run test:android:bridge

发版前：
- pnpm run test:android:smoke-core
- pnpm run test:android:legacy
- 如果涉及原生能力，补跑 bridge
- 如果涉及 Agent/模型链路，补跑 business
```

---

## 12. 优先改进路线

不要一开始就做很复杂的平台，建议按下面顺序推进。

---

### 第一优先级：增强 environment.json

确保每次测试结果都能说明：

```text
谁测的？
什么时候测的？
测的哪个 App？
哪个 H5 版本？
哪个后端环境？
哪个设备？
哪个 Android 版本？
哪个 WebView 版本？
用了什么测试账号？
执行了哪个 suite？
```

这是最容易做出专业感的改进。

---

### 第二优先级：新增 quality-summary.md

每次测试结束后自动输出人能看懂的总结：

```text
测试结论
执行概况
测试环境
失败问题
风险说明
发布建议
```

这个文件最适合日报、周报、实习汇报和发版评审。

---

### 第三优先级：给失败原因分类

在 `cases.json` 中新增字段：

```json
{
  "caseId": "CX-CHAT-021",
  "status": "failed",
  "failureType": "env_error",
  "failureReason": "AI response timeout, backend SSE unstable",
  "isBlocking": false,
  "isFlaky": true
}
```

失败归因能力是测试专业度的重要体现。

---

### 第四优先级：建立测试账号池文档

新增：

```text
docs/test-data.md
```

并在 `.env.example` 中体现：

```env
TEST_PHONE_SMOKE=
TEST_PHONE_PROFILE_DONE=
TEST_PHONE_NEW_USER=
TEST_PHONE_DESTRUCTIVE=
TEST_PHONE_BUSINESS=
SMS_FIXED_CODE=123
```

---

### 第五优先级：定义质量门禁规则

新增：

```text
quality-gate.json
```

并在报告中输出：

```text
Gate: Passed / Failed
Reason: 具体原因
Blocking Cases: 阻塞用例列表
```

---

### 第六优先级：接入 CI

从简单开始：

```text
PR / 提测：只跑 smoke-core
每日定时：跑 legacy
夜间任务：跑 business + bridge
发版前：跑 smoke-core + legacy + 相关专项
```

---

## 13. 面试或汇报时的专业表达

可以这样介绍你的工作：

```text
我目前负责 Android WebView 套壳 App 的自动化测试体系建设。

现阶段已经基于 Appium 3、UiAutomator2、WebdriverIO、TypeScript 和 Mocha 搭建了自动化测试工程，并按照测试风险将用例分为 P0 冒烟、legacy 快速回归、extended 扩展回归、bridge 原生能力专项、business 业务闭环专项和 all 全量测试。

在执行层面，脚本支持 macOS 和 Windows，并通过 .env 管理设备、系统版本、App 包名、Activity 和测试账号。每次执行会生成 summary.json、cases.json、environment.json、JUnit、Allure 和失败截图 / 页面源码等 artifacts。

下一步我计划把它从脚本工程升级为测试平台能力，重点补齐环境矩阵、测试账号池、质量门禁、失败归因、趋势统计和 CI 集成，使测试结果不仅能说明“用例是否通过”，还能说明“在什么环境下通过、失败原因是什么、是否阻塞发布、有哪些风险需要关注”。
```

---

## 14. 最终展示目标

不要只展示“写了多少脚本”，而是展示完整质量保障能力：

```text
1. 测试范围可定义
2. 测试环境可复现
3. 测试数据可管理
4. 测试用例可追踪
5. 测试执行可自动化
6. 测试结果可视化
7. 失败问题可归因
8. 发布风险可判断
9. 历史质量可对比
10. 测试流程可持续迭代
```

---

## 15. 一句话总结

你现在已经有了“自动化测试脚本”，下一步要建设的是“质量保障闭环”。

这个闭环包括：

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

做到这一点之后，你就不只是一个实习生在跑脚本，而是在参与搭建一个可度量、可复现、可汇报、可持续迭代的测试体系。
