# Android WebView 业务闭环专项补齐设计

## 背景

`Auto_test_Android_WebView` 已经具备登录、Chat、导航、个人信息、材料、健康档案和 Bridge 等 168 条基础自动化用例，但相比 `WeChat_H5_POC` 缺少完整业务闭环专项。`WeChat_H5_POC` 中更全面的增量主要集中在 `12-business-llm-smoke.spec.ts`、`business-llm.flow.ts`、`BusinessWidgetsPage.ts` 以及 `MaterialsPage` 对沟通卡编辑、跟练卡进度、阅读设置字号验证的增强。

## 目标

在不引入微信专用逻辑的前提下，将 WeChat 版本中可复用的业务闭环专项迁移到普通 Android WebView 自动化项目中，使 Android 项目可以通过独立命令执行业务 E2E/LLM 专项。

## 范围

本轮新增或增强：

- 新增业务组件页面对象：`src/pages/BusinessWidgetsPage.ts`
- 新增业务闭环流程：`src/flows/business-llm.flow.ts`
- 新增业务闭环 spec：`src/specs/12-business-llm-smoke.spec.ts`
- 增强 `src/pages/MaterialsPage.ts`，补充沟通卡编辑、跟练步骤/进度、字号读取等方法
- 更新 `wdio.android.conf.ts`，增加 `business` / `businessLlm` suite，并纳入 `all`
- 更新 `package.json`，增加 `test:android:business` / `test:android:business-llm`
- 更新 README，说明业务专项运行方式和前置账号/数据要求

## 非目标

- 不迁移 `wechat-*` 专用 flow/spec/controller。
- 不改变普通 Android App 的 WebView context 策略。
- 不默认把真实 LLM 业务专项放入日常 `legacy` 快速回归。
- 不修改 `.env` 中的真实账号和敏感信息。

## 关键设计

业务闭环 flow 以 WeChat 版本为蓝本，但认证入口使用 Android 项目已有的 `AuthFlow`。这可以复用普通 Android WebView App 的安装、清数据、启动、context 切换逻辑，避免引入微信保活、XWeb inspector、多 WebView page 等微信专属复杂性。

业务专项作为独立 suite 暴露，命令为 `pnpm run test:android:business`。它可以作为 extended/nightly 专项运行；日常稳定回归仍建议使用 `test:android:legacy`，避免真实模型链路的非确定性影响基础回归结论。

## 验证策略

本地静态验证以 `pnpm run typecheck` 为准，确保迁移代码在 Android 项目中类型正确。真实业务验证需要连接 Android 设备/Appium/测试环境后执行：

```bash
pnpm run test:android:business
```
