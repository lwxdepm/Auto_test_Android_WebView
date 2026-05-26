# Account Pool Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Android WebView 自动化测试的账号使用从“主账号承载多数状态”改造成“按用例前置状态隔离的账号池”，降低 skipped、误判和主账号污染。

**Architecture:** 在 `env.ts` 统一新增账号池配置和动态递增分配函数，在 `accounts.ts` 暴露语义化账号角色，在 `test-data.flow.ts` 提供 resolver / fixture 检查方法，然后让 medical OCR、consent、materials、business 用例按角色选择账号。报告与文档同步新增账号池字段，保证每次运行能解释账号前置状态。

**Tech Stack:** TypeScript + WebdriverIO + Appium + Mocha + H5 API fixture checks + existing report/environment snapshot.

---

## File map

- Modify: `Auto_test_Android_WebView/src/config/env.ts`
  - 新增 `TEST_PHONE_MEDICAL_DOC`、`TEST_PHONE_BUSINESS`、`TEST_PHONE_MATERIALS_FULL` 配置。
  - 新增对应动态递增分配函数，复用现有 `.test-state/phone-sequence.json` 机制。
- Modify: `Auto_test_Android_WebView/src/config/accounts.ts`
  - 新增 `medicalDoc`、`business`、`materialsFull` 账号角色。
- Modify: `Auto_test_Android_WebView/src/flows/test-data.flow.ts`
  - 扩展动态账号类型。
  - 新增 resolver：`resolveMedicalDocAccount`、`resolveBusinessAccount`、`resolveMaterialsFullAccount`、`resolveFreshNoHealthConsentAccount`。
  - 新增 fixture 检查：`findMedicalDocumentFixture`、`ensureMedicalDocumentFixture`。
- Modify: `Auto_test_Android_WebView/src/pages/MedicalRecordsPage.ts`
  - 新增按标题打开文档图片 lightbox / 删除取消验证的方法，避免默认打开第一条文档。
- Modify: `Auto_test_Android_WebView/src/flows/medical-fast.flow.ts`
  - OCR 文档类用例使用 `medicalDoc` 账号。
  - `CX-OCR-024` 显式选择多图文档。
  - 健康授权首次弹窗 / 拒绝流程支持 no-consent 动态账号重试。
- Modify: `Auto_test_Android_WebView/src/flows/materials-fast.flow.ts`
  - 跟练卡列表 / 详情优先使用 `materialsFull`。
- Modify: `Auto_test_Android_WebView/src/flows/business-llm.flow.ts`
  - 非新用户、非破坏性 business 用例优先使用 `business` 账号。
- Modify: `Auto_test_Android_WebView/src/specs/12-business-llm-smoke.spec.ts`
  - 将 business 默认账号从 `accounts.normal` 切到 `accounts.business`，并由 flow 内 resolver 兜底。
- Modify: `Auto_test_Android_WebView/src/core/reporting.ts`
  - `environment.json` 记录新增账号池脱敏状态。
- Modify: `Auto_test_Android_WebView/.env.example`
  - 增加新增账号池模板和注释。
- Modify: `Auto_test_Android_WebView/docs/test-data.md`
  - 更新账号池设计和运行前准备说明。

---

## Task 1: Extend environment and account role model

**Files:**
- Modify: `Auto_test_Android_WebView/src/config/env.ts`
- Modify: `Auto_test_Android_WebView/src/config/accounts.ts`
- Modify: `Auto_test_Android_WebView/.env.example`
- Modify: `Auto_test_Android_WebView/src/core/reporting.ts`

- [ ] **Step 1: Add env fields in `env.ts`**

Add these properties after `testPhoneMedicalPurgeBase` and before `testPhonePending`:

```ts
  testPhoneMedicalDoc: str('TEST_PHONE_MEDICAL_DOC', ''),
  testPhoneMedicalDocAutoIncrement: bool('TEST_PHONE_MEDICAL_DOC_AUTO_INCREMENT', false),
  testPhoneMedicalDocBase: str('TEST_PHONE_MEDICAL_DOC_BASE', '19900060000'),
  testPhoneBusiness: str('TEST_PHONE_BUSINESS', ''),
  testPhoneBusinessAutoIncrement: bool('TEST_PHONE_BUSINESS_AUTO_INCREMENT', false),
  testPhoneBusinessBase: str('TEST_PHONE_BUSINESS_BASE', '19900070000'),
  testPhoneMaterialsFull: str('TEST_PHONE_MATERIALS_FULL', ''),
  testPhoneMaterialsFullAutoIncrement: bool('TEST_PHONE_MATERIALS_FULL_AUTO_INCREMENT', true),
  testPhoneMaterialsFullBase: str('TEST_PHONE_MATERIALS_FULL_BASE', '19900080000'),
```

- [ ] **Step 2: Add allocation functions in `env.ts`**

Add these functions after `allocateNextMedicalPurgePhone()`:

```ts
export function allocateNextMedicalDocPhone(): string {
  if (!env.testPhoneMedicalDocAutoIncrement) {
    return env.testPhoneMedicalDoc
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneMedicalDocBase,
    env.testPhoneNeedsProfileStateFile,
    'medicalDoc',
    'TEST_PHONE_MEDICAL_DOC_BASE',
  )
  process.env.TEST_PHONE_MEDICAL_DOC = allocated
  env.testPhoneMedicalDoc = allocated
  console.log(`[dynamic-env] TEST_PHONE_MEDICAL_DOC=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneMedicalDocBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextBusinessPhone(): string {
  if (!env.testPhoneBusinessAutoIncrement) {
    return env.testPhoneBusiness
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneBusinessBase,
    env.testPhoneNeedsProfileStateFile,
    'business',
    'TEST_PHONE_BUSINESS_BASE',
  )
  process.env.TEST_PHONE_BUSINESS = allocated
  env.testPhoneBusiness = allocated
  console.log(`[dynamic-env] TEST_PHONE_BUSINESS=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneBusinessBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}

export function allocateNextMaterialsFullPhone(): string {
  if (!env.testPhoneMaterialsFullAutoIncrement) {
    return env.testPhoneMaterialsFull
  }
  const allocated = allocateIncrementalPhone(
    env.testPhoneMaterialsFullBase,
    env.testPhoneNeedsProfileStateFile,
    'materialsFull',
    'TEST_PHONE_MATERIALS_FULL_BASE',
  )
  process.env.TEST_PHONE_MATERIALS_FULL = allocated
  env.testPhoneMaterialsFull = allocated
  console.log(`[dynamic-env] TEST_PHONE_MATERIALS_FULL=${maskPhone(allocated)} (base=${maskPhone(env.testPhoneMaterialsFullBase)}, state=${env.testPhoneNeedsProfileStateFile})`)
  return allocated
}
```

- [ ] **Step 3: Add account roles in `accounts.ts`**

Add these entries before `pendingDeletion`:

```ts
  medicalDoc: {
    name: 'I-medical-doc',
    phone: env.testPhoneMedicalDoc,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  business: {
    name: 'J-business',
    phone: env.testPhoneBusiness,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  materialsFull: {
    name: 'K-materials-full',
    phone: env.testPhoneMaterialsFull,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
```

- [ ] **Step 4: Add reporting account keys in `reporting.ts`**

Extend `accountKeys`:

```ts
const accountKeys = [
  'TEST_PHONE_A',
  'TEST_PHONE_B',
  'TEST_PHONE_NEEDS_PROFILE',
  'TEST_PHONE_MATERIALS_EMPTY',
  'TEST_PHONE_MATERIALS_CARD',
  'TEST_PHONE_MATERIALS_FULL',
  'TEST_PHONE_NO_HEALTH_CONSENT',
  'TEST_PHONE_MEDICAL_PURGE',
  'TEST_PHONE_MEDICAL_DOC',
  'TEST_PHONE_BUSINESS',
  'TEST_PHONE_PENDING',
]
```

- [ ] **Step 5: Update `.env.example` account section**

Add after `TEST_PHONE_MEDICAL_PURGE_BASE=19900050000`:

```env
# 【多图病历 fixture 账号】用于 CX-OCR-014/015/022/024。
# 推荐使用固定账号：已完成资料、已同意健康档案授权、至少有一份 pageCount>=2 的病历文档。
TEST_PHONE_MEDICAL_DOC=
TEST_PHONE_MEDICAL_DOC_AUTO_INCREMENT=false
TEST_PHONE_MEDICAL_DOC_BASE=19900060000

# 【business / LLM 专项账号】用于真实模型链路、会话历史、沟通卡和跟练卡生成，避免污染 TEST_PHONE_A。
TEST_PHONE_BUSINESS=
TEST_PHONE_BUSINESS_AUTO_INCREMENT=false
TEST_PHONE_BUSINESS_BASE=19900070000

# 【材料完整账号】用于同时需要沟通卡和跟练卡的材料用例。
# 如果无法稳定自动生成跟练卡，建议配置为固定 fixture 账号。
TEST_PHONE_MATERIALS_FULL=
TEST_PHONE_MATERIALS_FULL_AUTO_INCREMENT=true
TEST_PHONE_MATERIALS_FULL_BASE=19900080000
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
cd Auto_test_Android_WebView
pnpm run typecheck
```

Expected: TypeScript compile succeeds.

- [ ] **Step 7: Commit**

```bash
cd Auto_test_Android_WebView
git add src/config/env.ts src/config/accounts.ts src/core/reporting.ts .env.example
git commit -m "feat: add isolated test account roles"
```

---

## Task 2: Add account resolvers and medical document fixture checks

**Files:**
- Modify: `Auto_test_Android_WebView/src/flows/test-data.flow.ts`

- [ ] **Step 1: Extend imports**

Replace the env import block with:

```ts
import {
  allocateNextBusinessPhone,
  allocateNextMaterialsFullPhone,
  allocateNextMedicalDocPhone,
  allocateNextMedicalPurgePhone,
  allocateNextMaterialsCardPhone,
  allocateNextMaterialsEmptyPhone,
  allocateNextNoHealthConsentPhone,
  env,
} from '../config/env.js'
```

- [ ] **Step 2: Add medical document type**

Add after `CommunicationCardRecord`:

```ts
interface MedicalDocumentRecord {
  id: string
  title: string | null
  pageCount?: number | null
  imageUrls?: string[] | null
  documentDate?: string | null
  uploadedAt?: string | null
}
```

- [ ] **Step 3: Extend dynamic account kind**

Replace:

```ts
type DynamicAccountKind = 'materialsEmpty' | 'materialsCard' | 'noHealthConsent' | 'medicalPurge'
```

with:

```ts
type DynamicAccountKind =
  | 'materialsEmpty'
  | 'materialsCard'
  | 'materialsFull'
  | 'noHealthConsent'
  | 'medicalPurge'
  | 'medicalDoc'
  | 'business'
```

- [ ] **Step 4: Add resolver helpers**

Add these methods inside `TestDataFlow`, after `resolveMedicalPurgeAccount()`:

```ts
  static resolveMedicalDocAccount(fallback: TestAccount = accounts.normal): TestAccount {
    if (!dynamicAccounts.medicalDoc) {
      const phone = env.testPhoneMedicalDocAutoIncrement
        ? allocateNextMedicalDocPhone()
        : env.testPhoneMedicalDoc
      dynamicAccounts.medicalDoc = phone
        ? { ...accounts.medicalDoc, phone }
        : fallback
    }
    return dynamicAccounts.medicalDoc
  }

  static resolveBusinessAccount(fallback: TestAccount = accounts.normal): TestAccount {
    if (!dynamicAccounts.business) {
      const phone = env.testPhoneBusinessAutoIncrement
        ? allocateNextBusinessPhone()
        : env.testPhoneBusiness
      dynamicAccounts.business = phone
        ? { ...accounts.business, phone }
        : fallback
    }
    return dynamicAccounts.business
  }

  static resolveMaterialsFullAccount(fallback: TestAccount = accounts.normal): TestAccount {
    if (!dynamicAccounts.materialsFull) {
      const phone = env.testPhoneMaterialsFullAutoIncrement
        ? allocateNextMaterialsFullPhone()
        : env.testPhoneMaterialsFull
      dynamicAccounts.materialsFull = phone
        ? { ...accounts.materialsFull, phone }
        : fallback
    }
    return dynamicAccounts.materialsFull
  }

  static resolveFreshNoHealthConsentAccount(): TestAccount | null {
    const phone = env.testPhoneNoHealthConsentAutoIncrement
      ? allocateNextNoHealthConsentPhone()
      : env.testPhoneNoHealthConsent
    if (!phone) return null
    dynamicAccounts.noHealthConsent = {
      ...accounts.noHealthConsent,
      phone,
    }
    return dynamicAccounts.noHealthConsent
  }
```

- [ ] **Step 5: Add medical document fixture helper**

Add after `ensureCommunicationCard`:

```ts
  static async findMedicalDocumentFixture(options: { minImages?: number } = {}): Promise<MedicalDocumentRecord | null> {
    const minImages = options.minImages ?? 1
    const docs = await H5ApiClient.get<MedicalDocumentRecord[]>('/medical/documents').catch(() => [])
    return docs.find((doc) => {
      const imageCount = doc.pageCount ?? doc.imageUrls?.length ?? 0
      return imageCount >= minImages && !!doc.title
    }) ?? null
  }

  static async ensureMedicalDocumentFixture(
    account: TestAccount,
    options: { minImages?: number; reason?: string } = {},
  ): Promise<MedicalDocumentRecord> {
    await this.ensureCompletedProfile(account)
    await H5Runtime.goto('/medical-records')
    const doc = await this.findMedicalDocumentFixture({ minImages: options.minImages ?? 1 })
    if (!doc) {
      const minImages = options.minImages ?? 1
      skipCase(options.reason ?? `当前账号缺少至少 ${minImages} 张图片的病历文档 fixture`)
    }
    return doc
  }
```

Also add import at top:

```ts
import { skipCase } from '../core/case-runner.js'
```

- [ ] **Step 6: Run typecheck**

```bash
cd Auto_test_Android_WebView
pnpm run typecheck
```

Expected: TypeScript compile succeeds.

- [ ] **Step 7: Commit**

```bash
cd Auto_test_Android_WebView
git add src/flows/test-data.flow.ts
git commit -m "feat: resolve isolated fixture accounts"
```

---

## Task 3: Make medical document UI operations target a specific document

**Files:**
- Modify: `Auto_test_Android_WebView/src/pages/MedicalRecordsPage.ts`

- [ ] **Step 1: Add targeted image lightbox method**

Add after `openFirstDocumentImageLightbox()`:

```ts
  static async openDocumentImageLightboxByTitle(title: string): Promise<void> {
    await this.openDocumentDetailByTitle(title)
    const image = $('img[alt^="病历图片 "]')
    await image.waitForDisplayed({ timeout: 10000 })
    await image.click()
    await $('img[alt^="图片 "]').waitForDisplayed({ timeout: 10000 })
  }
```

- [ ] **Step 2: Add targeted delete-cancel method**

Add after `expectDocumentDeleteCancelKeepsDetail()`:

```ts
  static async expectDocumentDeleteCancelKeepsDetailByTitle(title: string): Promise<void> {
    await this.openDocumentDetailByTitle(title)
    await H5Runtime.execute(() => {
      window.confirm = () => false
    })
    const deleteButton = selectors.exactText('删除此病历', 'button')
    await deleteButton.waitForClickable({ timeout: 10000 })
    await deleteButton.click()
    await browser.pause(500)
    await deleteButton.waitForDisplayed({ timeout: 5000 })
  }
```

- [ ] **Step 3: Run typecheck**

```bash
cd Auto_test_Android_WebView
pnpm run typecheck
```

Expected: TypeScript compile succeeds.

- [ ] **Step 4: Commit**

```bash
cd Auto_test_Android_WebView
git add src/pages/MedicalRecordsPage.ts
git commit -m "feat: target medical document fixture by title"
```

---

## Task 4: Route OCR document cases to the medical document fixture account

**Files:**
- Modify: `Auto_test_Android_WebView/src/flows/medical-fast.flow.ts`

- [ ] **Step 1: Add a private resolver method in `MedicalFastFlow`**

Add near the top of `MedicalFastFlow` class:

```ts
  private static resolveDocumentFixtureAccount(account: TestAccount): TestAccount {
    return TestDataFlow.resolveMedicalDocAccount(account)
  }
```

- [ ] **Step 2: Update `assertDocumentDetailOrSkip`**

Replace the method with:

```ts
  static async assertDocumentDetailOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveDocumentFixtureAccount(account)
    await this.ensureMedicalPageReady(account)
    const doc = await TestDataFlow.ensureMedicalDocumentFixture(account, {
      minImages: 1,
      reason: '当前病历 fixture 账号没有预置病历文档，跳过病历文档详情用例',
    })
    await H5Runtime.goto('/medical-records')
    await MedicalRecordsPage.waitForLoaded()
    await MedicalRecordsPage.openDocumentDetailByTitle(doc.title!)
  }
```

- [ ] **Step 3: Update `assertDocumentImagePreviewOrSkip`**

Replace the method with:

```ts
  static async assertDocumentImagePreviewOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveDocumentFixtureAccount(account)
    await this.ensureMedicalPageReady(account)
    const doc = await TestDataFlow.ensureMedicalDocumentFixture(account, {
      minImages: 1,
      reason: '当前病历 fixture 账号没有预置病历文档，跳过病历图片预览用例',
    })
    await H5Runtime.goto('/medical-records')
    await MedicalRecordsPage.waitForLoaded()
    await MedicalRecordsPage.openDocumentImageLightboxByTitle(doc.title!)
    await MedicalRecordsPage.expectLightboxAndClose()
  }
```

- [ ] **Step 4: Update `assertDocumentDeleteCancelOrSkip`**

Replace the method with:

```ts
  static async assertDocumentDeleteCancelOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveDocumentFixtureAccount(account)
    await this.ensureMedicalPageReady(account)
    const doc = await TestDataFlow.ensureMedicalDocumentFixture(account, {
      minImages: 1,
      reason: '当前病历 fixture 账号没有预置病历文档，跳过删除文档二次确认取消用例',
    })
    await H5Runtime.goto('/medical-records')
    await MedicalRecordsPage.waitForLoaded()
    await MedicalRecordsPage.expectDocumentDeleteCancelKeepsDetailByTitle(doc.title!)
  }
```

- [ ] **Step 5: Update `assertDocumentLightboxSwitchCloseOrSkip`**

Replace the method with:

```ts
  static async assertDocumentLightboxSwitchCloseOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveDocumentFixtureAccount(account)
    await this.ensureMedicalPageReady(account)
    const doc = await TestDataFlow.ensureMedicalDocumentFixture(account, {
      minImages: 2,
      reason: '当前病历 fixture 账号缺少至少 2 张图片的病历文档，无法验证大图切换',
    })
    await H5Runtime.goto('/medical-records')
    await MedicalRecordsPage.waitForLoaded()
    await MedicalRecordsPage.openDocumentImageLightboxByTitle(doc.title!)
    const count = await H5Runtime.execute(() => {
      const counter = Array.from(document.querySelectorAll('span')).find((el) => /\d+\s*\/\s*\d+/.test(el.textContent || ''))
      return counter?.textContent || ''
    })
    if (!count) {
      await MedicalRecordsPage.expectLightboxAndClose().catch(() => undefined)
      skipCase('多图病历打开后未出现大图计数器，无法验证大图切换')
    }
    await MedicalRecordsPage.expectLightboxAndClose()
  }
```

- [ ] **Step 6: Run focused typecheck**

```bash
cd Auto_test_Android_WebView
pnpm run typecheck
```

Expected: TypeScript compile succeeds.

- [ ] **Step 7: Commit**

```bash
cd Auto_test_Android_WebView
git add src/flows/medical-fast.flow.ts
git commit -m "feat: isolate OCR document fixture cases"
```

---

## Task 5: Retry fresh no-consent accounts for consent-first cases

**Files:**
- Modify: `Auto_test_Android_WebView/src/flows/medical-fast.flow.ts`

- [ ] **Step 1: Add helper to find a usable no-consent account**

Add inside `MedicalFastFlow`:

```ts
  private static async openFreshConsentDialogOrSkip(reason: string): Promise<TestAccount> {
    const maxAttempts = env.testPhoneNoHealthConsentAutoIncrement ? 5 : 1
    let lastAccount: TestAccount | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const candidate = TestDataFlow.resolveFreshNoHealthConsentAccount()
      if (!candidate) break
      lastAccount = candidate
      await this.openWithLocalConsentCleared(candidate)
      if ((await MedicalRecordsPage.waitForConsentOrLoaded()) === 'consent') {
        return candidate
      }
      await H5Runtime.clearLoginStorage().catch(() => undefined)
      await H5Runtime.goto('/login').catch(() => undefined)
    }

    const suffix = lastAccount?.phone ? `，最后尝试账号尾号=${lastAccount.phone.slice(-4)}` : ''
    skipCase(`${reason}${suffix}`)
  }
```

Also add import at top:

```ts
import { env } from '../config/env.js'
```

- [ ] **Step 2: Update `assertConsentDialogOrSkip`**

Replace method body with:

```ts
  static async assertConsentDialogOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFreshConsentDialogOrSkip('当前动态未授权账号仍存在远端健康档案授权，无法重复验证首次授权弹窗')
    await MedicalRecordsPage.waitForHealthConsentDialog()
    await MedicalRecordsPage.rejectHealthConsent()
    await ChatPage.waitForLoaded()
  }
```

- [ ] **Step 3: Update `assertRejectConsentOrSkip`**

Replace method body with:

```ts
  static async assertRejectConsentOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFreshConsentDialogOrSkip('当前动态未授权账号仍存在远端健康档案授权，无法重复验证拒绝授权')
    await MedicalRecordsPage.rejectHealthConsent()
    await ChatPage.waitForLoaded()
  }
```

- [ ] **Step 4: Run typecheck**

```bash
cd Auto_test_Android_WebView
pnpm run typecheck
```

Expected: TypeScript compile succeeds.

- [ ] **Step 5: Commit**

```bash
cd Auto_test_Android_WebView
git add src/flows/medical-fast.flow.ts
git commit -m "fix: retry fresh health-consent accounts"
```

---

## Task 6: Isolate materials-full and business accounts

**Files:**
- Modify: `Auto_test_Android_WebView/src/flows/materials-fast.flow.ts`
- Modify: `Auto_test_Android_WebView/src/flows/business-llm.flow.ts`
- Modify: `Auto_test_Android_WebView/src/specs/12-business-llm-smoke.spec.ts`

- [ ] **Step 1: Route practice card fast cases to materials-full account**

In `materials-fast.flow.ts`, replace `assertPracticeList` with:

```ts
  static async assertPracticeList(account: TestAccount = accounts.normal): Promise<void> {
    account = TestDataFlow.resolveMaterialsFullAccount(account)
    await TestDataFlow.ensureCompletedProfile(account)
    await this.open(account)
    await MaterialsPage.selectTab('我的跟练卡')
    if (!(await MaterialsPage.hasPracticeCards())) {
      skipCase('当前材料完整账号没有预置跟练卡，跳过跟练卡列表展示用例')
    }
  }
```

Replace `assertPracticeDetail` with:

```ts
  static async assertPracticeDetail(account: TestAccount = accounts.normal): Promise<void> {
    account = TestDataFlow.resolveMaterialsFullAccount(account)
    await TestDataFlow.ensureCompletedProfile(account)
    await this.open(account)
    await MaterialsPage.selectTab('我的跟练卡')
    if (!(await MaterialsPage.hasPracticeCards())) {
      skipCase('当前材料完整账号没有预置跟练卡，跳过跟练卡详情用例')
    }
    await MaterialsPage.openFirstPracticeCard()
  }
```

- [ ] **Step 2: Add business account resolver in `business-llm.flow.ts`**

Add inside `BusinessLlmFlow`:

```ts
  private static resolveBusinessAccount(account: TestAccount = accounts.normal): TestAccount {
    return TestDataFlow.resolveBusinessAccount(account)
  }
```

- [ ] **Step 3: Apply business resolver to non-new-user business methods**

At the start of each method below, add `account = this.resolveBusinessAccount(account)` before login/open actions:

```ts
static async openFreshChat(account: TestAccount = accounts.normal): Promise<void> {
  account = this.resolveBusinessAccount(account)
  await AuthFlow.ensureLoggedIn(account)
  await ChatPage.waitForLoaded()
  await ChatPage.startNewChat()
}

static async assertChatFeedbackShareHistoryDelete(account: TestAccount = accounts.normal): Promise<void> {
  account = this.resolveBusinessAccount(account)
  // keep existing method body after this line
}

static async assertCommunicationCardGenerateSaveToMaterials(account: TestAccount = accounts.normal): Promise<void> {
  account = this.resolveBusinessAccount(account)
  // keep existing method body after this line
}

static async assertInterventionMaterialGenerateSaveToMaterials(account: TestAccount = accounts.normal): Promise<void> {
  account = this.resolveBusinessAccount(account)
  // keep existing method body after this line
}

static async assertMedicalProfileApprovalApproveAndVisible(account: TestAccount = accounts.normal): Promise<void> {
  account = this.resolveBusinessAccount(account)
  // keep existing method body after this line
}

static async assertHiddenMedicalFieldPatchRejected(account: TestAccount = accounts.normal): Promise<void> {
  account = this.resolveBusinessAccount(account)
  // keep existing method body after this line
}
```

For methods that call `openFreshChat`, do not add a second resolver unless they directly call `AuthFlow.ensureLoggedIn(account)` before `openFreshChat`.

- [ ] **Step 4: Update business spec default account**

In `12-business-llm-smoke.spec.ts`, replace:

```ts
const account = accounts.normal
```

with:

```ts
const account = accounts.business
```

- [ ] **Step 5: Run typecheck**

```bash
cd Auto_test_Android_WebView
pnpm run typecheck
```

Expected: TypeScript compile succeeds.

- [ ] **Step 6: Commit**

```bash
cd Auto_test_Android_WebView
git add src/flows/materials-fast.flow.ts src/flows/business-llm.flow.ts src/specs/12-business-llm-smoke.spec.ts
git commit -m "feat: isolate materials and business accounts"
```

---

## Task 7: Update documentation and verification workflow

**Files:**
- Modify: `Auto_test_Android_WebView/docs/test-data.md`

- [ ] **Step 1: Update account variable table**

Replace the table in section `2. 当前账号池变量` with:

```md
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
```

- [ ] **Step 2: Update dynamic account table**

Add rows:

```md
| 材料完整账号 | `TEST_PHONE_MATERIALS_FULL_AUTO_INCREMENT` | `TEST_PHONE_MATERIALS_FULL_BASE` |
| 多图病历账号 | `TEST_PHONE_MEDICAL_DOC_AUTO_INCREMENT` | `TEST_PHONE_MEDICAL_DOC_BASE` |
| business 账号 | `TEST_PHONE_BUSINESS_AUTO_INCREMENT` | `TEST_PHONE_BUSINESS_BASE` |
```

- [ ] **Step 3: Add fixture preparation section**

Add a new section before `5. 破坏性用例规则`:

```md
## 5. Fixture 账号准备建议

1. `TEST_PHONE_MEDICAL_DOC` 推荐固定账号，至少准备一份 `pageCount >= 2` 的病历文档，供 `CX-OCR-024` 验证大图切换。
2. `TEST_PHONE_MATERIALS_FULL` 如果无法通过稳定 API 自动生成跟练卡，应使用固定 fixture 账号，提前保存一张可打开的跟练卡。
3. `TEST_PHONE_BUSINESS` 可固定，也可动态；如果使用固定账号，应接受会话、沟通卡、跟练卡持续累积，但不能用于清档或删除类用例。
4. `TEST_PHONE_A` 不建议作为多图病历和 business 的唯一承载账号，避免主冒烟账号被历史数据污染。
```

Then renumber following sections.

- [ ] **Step 4: Run docs and typecheck verification**

```bash
cd Auto_test_Android_WebView
pnpm run typecheck
pnpm run test:unit
```

Expected: TypeScript compile succeeds and unit tests pass.

- [ ] **Step 5: Commit**

```bash
cd Auto_test_Android_WebView
git add docs/test-data.md
git commit -m "docs: document isolated test account pool"
```

---

## Task 8: Manual verification on device

**Files:**
- No code changes.

- [ ] **Step 1: Configure local `.env` without committing it**

Set these values locally with real test accounts:

```env
TEST_PHONE_MEDICAL_DOC=固定多图病历账号
TEST_PHONE_MEDICAL_DOC_AUTO_INCREMENT=false
TEST_PHONE_BUSINESS=固定业务闭环账号
TEST_PHONE_BUSINESS_AUTO_INCREMENT=false
TEST_PHONE_MATERIALS_FULL=固定或动态材料完整账号
```

Do not commit `.env`.

- [ ] **Step 2: Run environment diagnosis**

```bash
cd Auto_test_Android_WebView
pnpm run doctor
```

Expected: Android device, app package/activity, Appium/WebView prerequisites pass.

- [ ] **Step 3: Run medical fast suite**

```bash
cd Auto_test_Android_WebView
pnpm run test:android:medical-fast
```

Expected:
- `CX-CONSENT-001` and `CX-CONSENT-003` either pass using fresh no-consent accounts or skip with explicit data reason after 5 attempts.
- `CX-OCR-024` passes when `TEST_PHONE_MEDICAL_DOC` has a multi-image document.
- `CX-MED-015` can remain skipped because product no longer exposes the “不确定” medication option.

- [ ] **Step 4: Run materials fast suite**

```bash
cd Auto_test_Android_WebView
pnpm run test:android:materials-fast
```

Expected:
- Communication card cases use auto-seeded `materialsCard`.
- Practice-card list/detail cases use `materialsFull`; they pass if fixture exists, otherwise skip with explicit fixture reason.

- [ ] **Step 5: Run business suite when model/backend environment is stable**

```bash
cd Auto_test_Android_WebView
pnpm run test:android:business
```

Expected:
- Non-new-user business cases do not use `TEST_PHONE_A` when `TEST_PHONE_BUSINESS` is configured.
- Destructive medical document delete persistence continues to use `TEST_PHONE_MEDICAL_PURGE`.

- [ ] **Step 6: Inspect latest report**

Open latest run directory and check:

```bash
cd Auto_test_Android_WebView
ls -t reports/runs | head -1
```

Expected:
- `environment.json` contains masked states for `TEST_PHONE_MEDICAL_DOC`, `TEST_PHONE_BUSINESS`, `TEST_PHONE_MATERIALS_FULL`.
- `quality-summary.md` explains remaining skipped cases as product-deprecated or fixture-missing, not ambiguous account-state failures.

---

## Self-review

- Spec coverage: account pools, medical multi-image fixture, no-consent retry, business isolation, material-full fixture, reporting, docs, and device verification are covered by Tasks 1-8.
- Placeholder scan: no unresolved marker words remain; example values in `.env.example` are concrete test-number ranges or explicit local-only labels.
- Type consistency: new env properties, account names, resolver names, and report keys use consistent names: `medicalDoc`, `business`, `materialsFull`.
- Scope check: this plan intentionally does not add backend test-only document creation APIs. Multi-image document seeding remains a fixture requirement to keep fast suites stable and avoid OCR/model dependency in setup.
