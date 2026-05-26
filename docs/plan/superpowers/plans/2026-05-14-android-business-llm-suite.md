# Android Business LLM Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the WeChat_H5_POC business E2E/LLM coverage layer to Auto_test_Android_WebView without importing WeChat-specific controller/auth behavior.

**Architecture:** Reuse existing Android WebView framework primitives (`AuthFlow`, `H5Runtime`, `H5ApiClient`, page objects, case runner). Add the missing business widgets page object, business flow, and spec; enhance MaterialsPage with methods required by the business flow; expose the new suite through WDIO and package scripts.

**Tech Stack:** TypeScript, WebdriverIO, Appium UiAutomator2, Mocha, pnpm.

---

### Task 1: Add business widgets page object

**Files:**
- Create: `src/pages/BusinessWidgetsPage.ts`

- [ ] Copy reusable business card/approval helper methods from `WeChat_H5_POC/src/pages/BusinessWidgetsPage.ts`.
- [ ] Keep imports pointing to local Android project pages and runtime.
- [ ] Verify no `wechat-*` dependencies are introduced.

### Task 2: Enhance MaterialsPage for business card and practice card assertions

**Files:**
- Modify: `src/pages/MaterialsPage.ts`

- [ ] Add communication card edit payload/types.
- [ ] Add open-by-title, detailed edit, validation, text font-size, practice overview, practice follow, and progress helper methods.
- [ ] Preserve existing methods and behavior used by current 168 tests.

### Task 3: Add Android business flow

**Files:**
- Create: `src/flows/business-llm.flow.ts`

- [ ] Port WeChat business flow logic.
- [ ] Replace `WeChatAuthFlow` with existing Android `AuthFlow`.
- [ ] Preserve skip behavior for missing dedicated accounts/destructive data.
- [ ] Keep real LLM/Agent cases in this separate flow only.

### Task 4: Add business spec and commands

**Files:**
- Create: `src/specs/12-business-llm-smoke.spec.ts`
- Modify: `wdio.android.conf.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Add the 13 business cases from WeChat_H5_POC.
- [ ] Add `business` and `businessLlm` suites.
- [ ] Add `test:android:business` and `test:android:business-llm` scripts.
- [ ] Document that this suite is extended/nightly style and depends on model/backend/test data readiness.

### Task 5: Verify

**Files:**
- Project-wide TypeScript files

- [ ] Run `pnpm run typecheck` in `Auto_test_Android_WebView`.
- [ ] If typecheck fails due migration errors, fix them and rerun.
- [ ] Do not run real Appium business E2E unless a device/Appium session is intentionally prepared.
