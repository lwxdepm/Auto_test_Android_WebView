# cx-agent WebView H5 实现逻辑评估与自动化测试设计

- 更新时间：2026-05-06 22:34:20
- 阅读范围：`cx-agent/packages/frontend`、`cx-agent/packages/backend`、`cx-agent/packages/shared` 中与登录、WebView 路由、聊天、健康档案、OCR、账号安全、材料、阅读设置相关的实现。

## 1. 前端关键实现逻辑

### 登录与登录态
- `Login.tsx`：手机号仅允许 11 位中国大陆手机号；发送验证码成功后进入 code step 并启动 60s 倒计时；登录必须勾选用户协议/隐私政策。
- `stores/slices/auth.ts`：`cx-token`、`cx-consents`、`cx-needs-profile`、`cx-require-complete-profile` 写入 localStorage；`logout()` 会清空 auth/chat/medical 相关 store，并 `window.location.replace('/login')`。
- `api.ts`：所有业务请求自动带 Bearer token；401 自动 logout；403 `ACCOUNT_PENDING_DELETION` 自动跳 `/deletion-pending`；GET 强制 no-cache。

### 路由与 WebView 壳
- `App.tsx` 使用 `BrowserRouter`，App/服务端必须支持任意 H5 深链 fallback 到 `index.html`。
- `AuthGuard.tsx`：无 token 跳 `/login`，`needsProfile` 用户强制跳 `/profile`。
- `MobileShell.tsx`、`globals.css`、`useVisualViewportKeyboard.ts`：通过 `--app-height`、`safe-area`、`--keyboard-offset` 适配移动 WebView 高度与软键盘。

### Chat
- `Chat.tsx`：默认走 `fetch('/api/chat/send') + ReadableStream` 解析 SSE；如果 `/chat/transport-mode` 返回 sync，则走 `/chat/send-sync`。
- 多会话并发通过 stream bucket 管理；新对话不 abort 旧会话后台流，重点测试“不串流/不串消息”。
- `InputBar.tsx`：聊天最多 5 张图，单图 10MB，超 100000 字禁发；语音依赖 HTTPS/MediaDevices/AudioWorklet/WebSocket。

### 健康档案与 OCR
- `useHealthProfileConsent.ts`：本地无授权时会尝试远端 `/auth/consents` 同步；同意授权落库后再继续原动作。
- `MedicalRecords.tsx`：未授权进入会弹“健康档案授权”；拒绝返回聊天；授权后才加载 profile/documents。
- `MedicalProfileCard.tsx`：字段由 `resolveVisibleMedicalFields(currentConcern, gender)` 控制；男性隐藏月经状态；非肿瘤关注隐藏肿瘤扩展字段。
- `MedicalOcr.tsx`：OCR 最多 10 张、单图 10MB；成功后将提取字段回填到病历档案并新增文档。

### 账号安全
- `ClearMedicalDataDialog.tsx`：清空档案流程为风险确认 → 自动发短信 → 输入验证码 → 立即清空 → 成功页。
- `DeleteAccountWizard.tsx`：注销流程为 10s 阅读倒计时 → 输入“确认注销” → 短信验证 → 进入 15 天冷静期；注释里写 30s，但当前代码实际是 10s。

## 2. 后端关键实现逻辑

### 验证码
- `services/sms.ts`：验证码 TTL=300s；local/dev 或 `SMS_USE_FIXED_CODE=true` 使用固定码 `123`；校验成功后删除 Redis key。
- `routes/auth.ts`：`/auth/send-code` 与 `/auth/login` 都有限流；登录协议未同意会直接 400。

### 账号状态
- `middleware/active-account.ts`：pending_deletion 用户访问 chat/sessions/medical/materials 等业务路由会收到 403 + `ACCOUNT_PENDING_DELETION`。
- `/api/account/*` 不挂 active-account，因此冷静期仍能查询状态和撤销注销。

### 健康档案
- `routes/medical.ts`：`POST /medical` 保存医疗档案前强制 health_profile consent；后端重新校验字段可见性与枚举，不能只依赖前端隐藏。
- `services/user.ts`：结构化档案 merge-patch；相对时间字段由服务端维护 `fieldUpdatedAt`。
- `services/account-deletion.ts`：`purgeMedicalData()` 只删医疗档案/文档/OSS，不删用户、对话、授权与记忆。

### Chat 传输
- `services/chat-transport.ts`：只有 `ios_webkit` UA bucket 会因特定客户端错误标记 sync fallback；Android 默认仍 stream。
- `routes/client-error.ts`：收到 `TypeError: Load failed` 或 `Illegal access` 且 phase=`fetch-or-reader` 时标记 sync fallback。

## 3. 自动化风险与建议

1. **建议给前端补 `data-testid`**：当前大量控件只能靠中文文案、SVG title 或层级定位，Appium/Chromedriver 在 WebView 中会偏脆。
2. **验证码超时不要真实等待 5 分钟**：建议测试环境提供 Redis 清 key/API 测试钩子，或由自动化脚本直接操作测试 Redis。
3. **破坏性用例必须使用专用账号**：清空档案、删除文档、注销账号、撤销注销应从 P0 fast 中拆出去。
4. **OCR/AI/ASR 归慢速套件**：P0 只测上传入口、格式校验和错误兜底；真实 OCR 和 Agent tool 结果放 nightly。
5. **WebView 容器能力需 App 配合**：file chooser、相机 capture、麦克风权限、Android 系统返回键、深链 fallback 是 H5 代码外的关键依赖。
6. **关注 bodyLimit 风险**：聊天/OCR 前端按单图限制，但后端全局 bodyLimit 为 10MB，多图总量可能 413，应单独自动化覆盖。

详细用例已同步到：
- `webview-h5-test-cases.md`
- `webview-h5-test-cases.csv`
- `webview-h5-test-cases.xlsx`
- `webview-h5-p0-fast-cases.csv`
