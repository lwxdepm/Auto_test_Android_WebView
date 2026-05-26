# Android WebView 自动化测试数据与账号池

本文说明测试账号池、动态账号、破坏性数据和测试前后数据管理规则。

---

## 1. 管理原则

1. 真实手机号、验证码、token、接口密钥只能放在本地 `.env` 或 CI secret 中。
2. `.env.example` 和文档只能保留占位值或测试号段示例。
3. 破坏性操作必须使用专用账号或动态递增账号。
4. 主冒烟账号应保持稳定，避免被清档、注销或修改为未完成资料状态。
5. 用例失败时需要区分产品问题、脚本问题、环境问题和数据前置问题。

---

## 2. 当前账号池变量

| 变量 | 建议账号类型 | 用途 | 是否允许破坏性操作 |
| --- | --- | --- | --- |
| `TEST_PHONE_A` | `smoke_user` | 冒烟和日常主链路；要求已完成资料且登录后进入 Chat | 否 |
| `TEST_PHONE_B` | `secondary_user` | 切账号、缓存隔离等场景 | 否 |
| `TEST_PHONE_NEEDS_PROFILE` | `new_user` | 首次资料填写流程 | 可消耗 |
| `TEST_PHONE_MATERIALS_EMPTY` | `material_empty_user` | 我的材料空态 | 可消耗 |
| `TEST_PHONE_MATERIALS_CARD` | `material_card_user` | 沟通卡相关流程 | 可消耗 |
| `TEST_PHONE_MATERIALS_FULL` | `material_full_user` | 跟练卡、材料双 Tab 完整状态 | 建议专用 |
| `TEST_PHONE_NO_HEALTH_CONSENT` | `no_health_consent_user` | 健康档案未授权流程 | 可消耗 |
| `TEST_PHONE_MEDICAL_DOC` | `medical_doc_user` | 病历详情、图片预览、多图切换；要求至少一份多图病历 | 否 |
| `TEST_PHONE_MEDICAL_PURGE` | `destructive_user` | 清档、删除病历持久化专项 | 是，仅限专用账号 |
| `TEST_PHONE_BUSINESS` | `business_user` | Agent / LLM 业务闭环，避免污染主账号 | 否 |
| `TEST_PHONE_PENDING` | `pending_deletion_user` | 注销冷静期等账号安全专项 | 是，仅限专用账号 |

---

## 3. 动态递增账号

当前项目支持多类账号自动递增，减少人工维护测试号：

| 账号池 | 开关 | 起始号段 |
| --- | --- | --- |
| 未完善资料账号 | `TEST_PHONE_NEEDS_PROFILE_AUTO_INCREMENT` | `TEST_PHONE_NEEDS_PROFILE_BASE` |
| 空材料账号 | `TEST_PHONE_MATERIALS_EMPTY_AUTO_INCREMENT` | `TEST_PHONE_MATERIALS_EMPTY_BASE` |
| 沟通卡账号 | `TEST_PHONE_MATERIALS_CARD_AUTO_INCREMENT` | `TEST_PHONE_MATERIALS_CARD_BASE` |
| 材料完整账号 | `TEST_PHONE_MATERIALS_FULL_AUTO_INCREMENT` | `TEST_PHONE_MATERIALS_FULL_BASE` |
| 未授权健康档案账号 | `TEST_PHONE_NO_HEALTH_CONSENT_AUTO_INCREMENT` | `TEST_PHONE_NO_HEALTH_CONSENT_BASE` |
| 清空健康档案账号 | `TEST_PHONE_MEDICAL_PURGE_AUTO_INCREMENT` | `TEST_PHONE_MEDICAL_PURGE_BASE` |
| 多图病历账号 | `TEST_PHONE_MEDICAL_DOC_AUTO_INCREMENT` | `TEST_PHONE_MEDICAL_DOC_BASE` |
| business 账号 | `TEST_PHONE_BUSINESS_AUTO_INCREMENT` | `TEST_PHONE_BUSINESS_BASE` |

递增状态保存在：

```text
.test-state/phone-sequence.json
```

注意：不要随意删除该文件，否则账号会从 base 重新分配，可能重复使用旧账号。

---

## 4. 推荐账号状态

| 账号类型 | 前置状态 | 适合用例 |
| --- | --- | --- |
| `smoke_user` | active，资料完整，登录后直接进入 `/chat` | P0 冒烟、legacy 主流程 |
| `new_user` | 可登录但未完善资料 | 首次资料页、强制资料填写 |
| `material_empty_user` | 资料完整，但没有材料 | 材料空态 |
| `material_card_user` | 资料完整，有自动化沟通卡 | 材料详情、沟通卡编辑 |
| `material_full_user` | 资料完整，有沟通卡和跟练卡 | 跟练卡列表、详情、材料双 Tab |
| `no_health_consent_user` | 资料完整，未同意健康档案授权 | 健康授权弹窗、拒绝流程 |
| `medical_doc_user` | 资料完整，已授权健康档案，至少一份多图病历 | 病历详情、图片预览、多图切换 |
| `destructive_user` | 专门用于清档/删除/注销 | 清空健康档案、注销专项 |
| `business_user` | 资料完整，可访问 Agent/模型链路 | business / LLM 专项 |

---

## 5. Fixture 账号准备建议

1. `TEST_PHONE_MEDICAL_DOC` 推荐固定账号，至少准备一份 `pageCount >= 2` 的病历文档，供 `CX-OCR-024` 验证大图切换。
2. `TEST_PHONE_MATERIALS_FULL` 如果无法通过稳定 API 自动生成跟练卡，应使用固定 fixture 账号，提前保存一张可打开的跟练卡。
3. `TEST_PHONE_BUSINESS` 可固定，也可动态；如果使用固定账号，应接受会话、沟通卡、跟练卡持续累积，但不能用于清档或删除类用例。
4. `TEST_PHONE_A` 不建议作为多图病历和 business 的唯一承载账号，避免主冒烟账号被历史数据污染。

---

## 6. 破坏性用例规则

破坏性用例包括但不限于：

- 清空健康档案。
- 删除材料、删除沟通卡。
- 注销账号或进入注销冷静期。
- 修改账号关键资料导致主链路不可用。

规则：

1. 不允许使用 `TEST_PHONE_A` 执行破坏性操作。
2. 破坏性用例必须使用专用变量或动态递增账号。
3. 如果专用账号缺失，用例应标记为 `skipped`，不能误报为产品失败。
4. 报告中需要记录 skipped 原因，例如“缺少 TEST_PHONE_MEDICAL_PURGE”。

---

## 7. 测试前数据检查

执行 `smoke-core` 前至少确认：

```text
TEST_PHONE_A：可用、active、资料已完成、登录后进入 Chat
SMS_FIXED_CODE：与测试环境固定验证码一致
ANDROID_APP_PACKAGE：当前测试包包名正确
RESET_APP_CLEAR_DATA_BEFORE_RUN：按本次测试目的设置
```

如果 `CX-WV-BASE-002` 或 `CX-CHAT-001` 失败，优先检查 `TEST_PHONE_A` 是否已经变成未完善资料、注销冷静期、无权限或后端状态异常。

---

## 8. 测试后数据恢复

现阶段建议：

1. 主账号不做破坏性恢复，保持稳定状态。
2. 动态递增账号不复用，保留状态文件避免重复分配。
3. 专用破坏性账号如需复用，应由后端脚本或测试数据 API 明确重置。
4. 后续可增加 `pre-run-reset` 和 `post-run-cleanup` 的结构化结果记录。

---

## 9. 安全要求

- 不提交真实 `.env`。
- 不在 README、docs、issue、PR 中写真实手机号全量明文。
- 报告中展示手机号时建议脱敏为 `133****0000`。
- CI 中使用 secret 注入账号、验证码和接口 token。
