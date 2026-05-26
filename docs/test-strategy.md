# Android WebView 自动化测试策略

本文说明当前 Android WebView 自动化测试的目标、范围、用例分层、优先级和执行策略。

---

## 1. 测试目标

当前工程的目标不是单纯“跑脚本”，而是形成可复现、可追踪、可度量、可汇报、可接入 CI 的质量保障流程。

核心目标：

1. 验证 Android WebView 套壳 App 的主链路是否可用。
2. 快速发现登录、WebView 白屏、Chat 不可用、路由异常、核心入口不可达等阻塞问题。
3. 将日常快速回归、业务闭环专项、原生能力专项分开执行，降低日常回归波动。
4. 为报告、失败归因、质量门禁和 CI 接入提供稳定口径。

---

## 2. 测试范围

### 2.1 当前覆盖范围

- App 启动与 WebView context 切换。
- 登录页基础校验、固定验证码登录、登录态和深链。
- Chat 页面加载、输入框、消息发送、历史会话、反馈操作。
- 侧边栏、阅读设置、个人信息、账号与安全。
- 我的材料、健康档案、授权与基础数据展示。
- 相册、相机、麦克风、复制粘贴等原生 bridge 能力。
- Agent / LLM / SSE / 材料 / 审批卡 / 沟通卡等业务闭环专项。

### 2.2 暂不作为日常快速回归的范围

- 弱网、断网、多设备兼容矩阵。
- 真实生产环境验证。
- iOS WebView 自动化。
- 高波动的外部模型、供应商接口、系统 UI 选择器。
- 注销、清档等破坏性流程，除非使用专用账号或动态账号。

---

## 3. 测试套件分层

| npm 命令 | WDIO suite | 当前规模 | 使用场景 | 是否门禁 |
| --- | --- | ---: | --- | --- |
| `pnpm run test:android:smoke-core` | `smokeCore` | 10 条 | 每次提测/回归前快速确认主链路 | 是 |
| `pnpm run test:android:smoke` | `smoke` | 76 条 | 兼容旧 smoke 范围 | 视情况 |
| `pnpm run test:android:legacy` | `legacy` | 163 条 | 日常主要快速回归 | 是 |
| `pnpm run test:android:extended-fast` | `extendedFast` | 143 条 | 模块扩展快速验证 | 否 |
| `pnpm run test:android:bridge` | `bridge` | 4 条 | 原生 bridge 能力专项 | 视版本改动 |
| `pnpm run test:android:bridge-slow` | `bridgeSlow` | 1 条 | 相机专项 | 视版本改动 |
| `pnpm run test:android:business` | `business` | 13 条 | Agent/LLM/业务闭环专项 | 专项/夜间 |
| `pnpm run test:android:all` | 全部 specs | 191 个执行实例 / 181 个唯一用例 | 发版前或夜间全量 | 不建议日常跑 |

说明：`smoke-core` 的 10 条用例会与 legacy 中的部分用例重复，所以全部 specs 的执行实例数大于唯一用例数。

当前报告中的 `TEST_SUITE_NAME` 默认值为 `webview-p0-fast`，后续建议与命令口径统一为 `smoke-core`。

---

## 4. P0 冒烟用例

`smoke-core` 当前包含：

| 用例 ID | 目的 | 优先级 |
| --- | --- | --- |
| `CX-WV-BASE-001` | App 启动后 WebView 可切入，页面非白屏 | P0 |
| `CX-WV-BASE-004` | 登录页基础表单校验可用 | P0 |
| `CX-WV-BASE-002` | 固定验证码账号可登录进入 Chat | P0 |
| `CX-CHAT-001` | Chat 页面核心元素加载 | P0 |
| `CX-INPUT-001` | Chat 输入框默认状态正常 | P0 |
| `CX-CHAT-004` | 可发送一条普通文字消息 | P0 |
| `CX-NAV-001` | 侧边栏可打开并展示关键入口 | P0 |
| `CX-MAT-001` | 我的材料页面可进入并展示列表或空态 | P1 |
| `CX-MED-001` | 健康档案页面可进入并展示基础内容 | P0 |
| `CX-WV-COMPAT-002` | Chat 输入框不被软键盘明显遮挡 | P0 |

这组用例应避免相机、相册、麦克风、注销、清档、真实业务 LLM 等高波动或破坏性场景。

---

## 5. 用例优先级定义

| 优先级 | 定义 | 示例 | 门禁建议 |
| --- | --- | --- | --- |
| P0 | 主链路或阻塞发布能力 | WebView 白屏、登录失败、Chat 不可用 | 失败即阻塞 |
| P1 | 核心功能但有绕行或局部影响 | 材料页、健康档案、个人信息部分字段 | 根据套件和影响判断 |
| P2 | 次要功能、低频场景或专项风险 | 注销流程、部分设置项、边界提示 | 记录风险，不默认阻塞 |

---

## 6. 推荐执行策略

1. 每次提测或发版前先执行：`pnpm run doctor`。
2. 环境检查通过后执行：`pnpm run test:android:smoke-core`。
3. `smoke-core` 通过后执行：`pnpm run test:android:legacy`。
4. 如果版本涉及原生能力，补跑：`bridge` / `bridge-slow`。
5. 如果版本涉及 Agent、模型、SSE、材料、健康档案等闭环，补跑：`business`。
6. `all` 只建议在发版前或夜间任务中执行，不作为日常快速回归。

---

## 7. 测试资产管理口径

当前项目已有事实源：

```text
testcases/*.csv
src/config/case-manifest.ts
src/specs/*.ts
```

建议现阶段继续以 CSV + `case-manifest.ts` 作为用例元数据来源，不立即引入新的 `cases/` 目录作为第二套事实源。

后续如果要平台化，可再演进为：

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

演进前必须保证只有一个事实源，避免 CSV、spec、registry 三处数据不一致。

---

## 8. 发布建议规则

| 场景 | 建议结论 |
| --- | --- |
| `doctor` 失败 | 不进入正式测试，先修环境 |
| `smoke-core` P0 失败 | 阻塞发布 |
| `legacy` P0/P1 大面积失败 | 阻塞发布或回退版本 |
| `bridge` 失败但本次未改原生能力 | 记录风险，可不阻塞普通 H5 发布 |
| `business` 因外部模型或后端波动失败 | 标注外部依赖风险，结合版本范围判断 |
| 破坏性账号前置不满足导致 skipped | 不算产品失败，但需要补齐账号池 |
