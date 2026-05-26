# WebView H5 自动化用例配置说明（自动化建议=是）

已按 `testcases/webview-h5-test-cases.xlsx` 中 **“自动化建议”严格等于“是”** 的用例实现：**162 / 162**。项目里额外保留了已有的 `CX-WV-COMPAT-003`。

## 1. 必填基础配置

`.env` 至少需要配置：

```env
ANDROID_DEVICE_NAME=你的设备名
ANDROID_PLATFORM_VERSION=你的 Android 版本
ANDROID_APP_PACKAGE=被测 App 包名
ANDROID_APP_ACTIVITY=被测 App 启动 Activity
SMS_FIXED_CODE=123
TEST_PHONE_A=已完成资料且登录后直接进入 /chat 的主账号
```

`TEST_PHONE_A` 会被大多数登录、导航、对话、个人信息、健康档案、材料用例复用。

## 2. 特殊账号 / 数据配置

| 用例 | 需要配置 | 说明 |
|---|---|---|
| `CX-WV-BASE-018` | `TEST_PHONE_B` | 第二个已完成资料账号，用于切账号缓存隔离。 |
| `CX-PROFILE-001/003/008/013/014` | `TEST_PHONE_NEEDS_PROFILE` 或 `TEST_PHONE_NEEDS_PROFILE_AUTO_INCREMENT=true` | 未完善资料的新账号；推荐自动递增。 |
| `CX-MAT-002/011` | `TEST_PHONE_MATERIALS_EMPTY` 或自动递增 | 空材料账号；脚本会自动补全基础资料。 |
| `CX-MAT-003/004/005/006/007/008/016` | `TEST_PHONE_MATERIALS_CARD` 或自动递增，`SEED_COMMUNICATION_CARD_BEFORE_CASES=true` | 沟通卡账号；脚本会自动造一张沟通卡。 |
| `CX-CONSENT-001/003` | `TEST_PHONE_NO_HEALTH_CONSENT` 或自动递增 | 未授权健康档案账号。 |
| `CX-MED-026` | `TEST_PHONE_MEDICAL_PURGE` 或 `TEST_PHONE_MEDICAL_PURGE_AUTO_INCREMENT=true` | 会真实清空该账号健康档案，必须专用账号；已加入 `.env.example`。 |
| `CX-OCR-014/015/022/024` | 主账号或专用账号需预置病历文档 | `CX-OCR-024` 最好准备含 2 张及以上图片的病历文档；无数据会 skipped。 |
| `CX-INPUT-012` | 不支持录音的 WebView 环境 | 例如非 HTTPS、无 `mediaDevices.getUserMedia` 或无 `AudioWorklet`；当前环境支持录音时会 skipped。 |
| `CX-WV-BASE-012` | `RESTART_APP_CASE_ENABLED=true` | Appium session 内 force-stop / restart 对 WebView 较敏感，默认 skipped。 |
| `CX-CHAT-025` | `CHAT_LONG_HISTORY_TURNS=16` | 生成 16 轮临时 sync 对话（32 条消息）来验证加载更早历史；小于 16 会 skipped。 |

## 3. 图片 / 文件输入

以下用例**不需要你准备本地图片文件**，脚本会在 WebView 内构造 `File` 对象：

- 聊天输入图片：`CX-INPUT-005/006/007/008/009/010`、`CX-CHAT-024`
- 病历上传图片：`CX-OCR-004/005/006/008/009`

需要你预置真实业务数据的只有病历文档详情类：

- `CX-OCR-014`：至少 1 份病历文档。
- `CX-OCR-015`：文档需带图片。
- `CX-OCR-022`：文档可删除入口可见。
- `CX-OCR-024`：建议文档带 2 张及以上图片，便于验证大图切换。

## 4. 会修改或清理数据的用例

建议使用测试环境和专用账号：

- `CX-WV-BASE-009`：会执行 `pm clear <package>` 清 App 本地数据。
- `CX-CHAT-026`：删除脚本创建的当前临时会话。
- `CX-MAT-006`：修改脚本预置沟通卡内容。
- `CX-MED-018/019/020/029/031`：会修改账号个人资料或健康档案字段，脚本会尽量恢复主账号为“女 + 乳腺肿瘤相关诊疗”。
- `CX-MED-026`：真实调用清空健康档案，请使用 `TEST_PHONE_MEDICAL_PURGE` 专用账号。
- `CX-SEC-009/010/011/017`：会触发验证码发送流程，但不会执行真实清空或注销确认。

## 5. 建议运行

```powershell
pnpm test:android:all
```

如果只想先验证新增实现较多的模块：

```powershell
pnpm test:android:chat-fast
pnpm test:android:profile-fast
pnpm test:android:materials-fast
pnpm test:android:medical-fast
```
