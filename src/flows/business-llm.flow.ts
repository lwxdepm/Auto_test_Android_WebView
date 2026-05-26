import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { allocateNextNeedsProfilePhone, env } from '../config/env.js'
import { skipCase } from '../core/case-runner.js'
import { H5ApiClient } from '../core/h5-api-client.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { InputBarPage } from '../pages/InputBarPage.js'
import { LoginPage } from '../pages/LoginPage.js'
import { MaterialsPage } from '../pages/MaterialsPage.js'
import { MedicalRecordsPage } from '../pages/MedicalRecordsPage.js'
import { ProfilePage } from '../pages/ProfilePage.js'
import { ReadingSettingsPage } from '../pages/ReadingSettingsPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { BusinessWidgetsPage } from '../pages/BusinessWidgetsPage.js'
import { TestDataFlow } from './test-data.flow.js'
import { AuthFlow } from './auth.flow.js'

interface SessionListItem {
  id: string
  title: string | null
  messageCount: number
  updatedAt: string
}

interface SessionListResponse {
  items: SessionListItem[]
}

interface CreatedSession {
  id: string
  title: string | null
}

interface CommunicationCardDraft {
  title: string
  cardDate: string
  visitPurpose: string
  currentSituation?: string
  informationForDoctor?: string
  questionsForDoctor?: string
}

interface CommunicationCardRecord {
  id: string
  title: string
  cardDate: string
  sourceSessionId: string | null
  contentJson: {
    draft: CommunicationCardDraft
  }
}

interface SavedInterventionMaterialRecord {
  engagement: {
    id: string
    sessionId: string
    toolCallId: string
    savedAt: string | null
    followStartedAt: string | null
    followCompletedAt: string | null
    totalFollowSec: number
    completedStepCount: number
    totalStepCount: number
    lastStepIndex: number | null
  }
  detail: {
    actionName?: string
    stepsMeta?: unknown[]
  } | null
}

interface SavedInterventionMaterialListResponse {
  items: SavedInterventionMaterialRecord[]
}

interface MedicalDocumentRecord {
  id: string
  title: string | null
  documentDate?: string | null
  uploadedAt?: string
}

const BUSINESS_LLM_TIMEOUT_MS = Number(process.env.BUSINESS_LLM_TIMEOUT_MS || 150000)

function needsProfileAccount(): TestAccount {
  const phone = env.testPhoneNeedsProfileAutoIncrement
    ? allocateNextNeedsProfilePhone()
    : env.testPhoneNeedsProfile
  if (!phone) {
    skipCase('未配置 TEST_PHONE_NEEDS_PROFILE 或 TEST_PHONE_NEEDS_PROFILE_AUTO_INCREMENT，跳过新用户首登闭环')
  }
  return {
    ...accounts.needsProfile,
    phone,
  }
}

export class BusinessLlmFlow {
  private static resolveBusinessAccount(account: TestAccount = accounts.normal): TestAccount {
    return TestDataFlow.resolveBusinessAccount(account)
  }

  private static async getCommunicationCards(): Promise<CommunicationCardRecord[]> {
    return H5ApiClient.get<CommunicationCardRecord[]>('/medical/communication-cards')
  }

  private static async getSavedInterventionMaterials(): Promise<SavedInterventionMaterialListResponse> {
    return H5ApiClient.get<SavedInterventionMaterialListResponse>('/intervention-material-runtime/saved')
  }

  private static async openFirstCommunicationCardOrCreate(account: TestAccount): Promise<CommunicationCardRecord> {
    account = this.resolveBusinessAccount(account)
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的沟通卡')

    let cards = await this.getCommunicationCards().catch(() => [])
    const hasCardsInUi = cards.length > 0 && await MaterialsPage.hasCommunicationCards()
    if (!hasCardsInUi) {
      await this.assertCommunicationCardGenerateSaveToMaterials(account)
      cards = await this.getCommunicationCards()
      assert.ok(cards[0], '生成并保存沟通卡后，/api/medical/communication-cards 未返回记录')
      return cards[0]
    }

    await MaterialsPage.openFirstCommunicationCard()
    return cards[0]
  }

  private static async openFirstPracticeCardOrCreate(account: TestAccount): Promise<SavedInterventionMaterialRecord> {
    account = this.resolveBusinessAccount(account)
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的跟练卡')

    let saved = await this.getSavedInterventionMaterials().catch(() => ({ items: [] }))
    const hasCardsInUi = saved.items.length > 0 && await MaterialsPage.hasPracticeCards()
    if (!hasCardsInUi) {
      await this.assertInterventionMaterialGenerateSaveToMaterials(account)
      saved = await this.getSavedInterventionMaterials()
      assert.ok(saved.items[0], '生成并保存跟练卡后，/api/intervention-material-runtime/saved 未返回记录')
      return saved.items[0]
    }

    await MaterialsPage.openFirstPracticeCard()
    const body = await H5Runtime.getBodyText()
    if (body.includes('该跟练方案暂时不可用')) {
      await this.assertInterventionMaterialGenerateSaveToMaterials(account)
      saved = await this.getSavedInterventionMaterials()
      assert.ok(saved.items[0], '重新生成并保存跟练卡后，/api/intervention-material-runtime/saved 未返回记录')
      return saved.items[0]
    }

    return saved.items[0]
  }

  static async openFreshChat(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    await AuthFlow.ensureLoggedIn(account)
    await ChatPage.waitForLoaded()
    await ChatPage.startNewChat()
  }

  static async sendPrompt(text: string, account: TestAccount = accounts.normal): Promise<void> {
    await this.openFreshChat(account)
    // 后端 chat 通常有 1s 限流；完整业务链路主动拉开间隔。
    await browser.pause(1200)
    await InputBarPage.sendText(text)
    await ChatPage.expectUserMessage(text)
    await ChatPage.waitForGenerationStartedOrFinished(30000)
  }

  static async assertNewUserFirstActivationToFirstChat(): Promise<void> {
    const account = needsProfileAccount()
    await AuthFlow.ensureOnLoginPage()
    await AuthFlow.sendCode(account.phone)
    await LoginPage.inputCode(account.fixedCode)
    await LoginPage.checkAgreement()
    await LoginPage.submitLogin()
    const path = await LoginPage.expectLoginSuccess(true)
    if (path !== '/profile') {
      skipCase(`当前 TEST_PHONE_NEEDS_PROFILE 登录后未进入 /profile，实际=${path}；该账号可能已完善资料`)
    }

    await ProfilePage.waitForLoaded()
    await ProfilePage.save()
    await ProfilePage.expectErrorContains('请完整填写')
    const nickname = `Android首登闭环${Date.now().toString().slice(-6)}`
    await ProfilePage.fillRequiredProfile(nickname)
    await ProfilePage.save()
    await ChatPage.waitForLoaded()

    const token = await H5Runtime.getLocalStorage('cx-token')
    assert.ok(token, '首登完善资料后 token 应保持存在')
    assert.equal(await H5Runtime.getLocalStorage('cx-needs-profile'), 'false', '首登完善资料后 cx-needs-profile 应清除/置 false')

    const firstQuestion = `Android首登后首轮普通问题${Date.now().toString().slice(-6)}：请用一句话提醒我记录今天的不适。`
    await browser.pause(1200)
    await InputBarPage.sendText(firstQuestion)
    await ChatPage.expectUserMessage(firstQuestion)
    await ChatPage.waitForAssistantFinal(BUSINESS_LLM_TIMEOUT_MS)
  }

  static async assertChatFeedbackShareHistoryDelete(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    const prompt = `Android业务闭环主链路${Date.now().toString().slice(-6)}：请只用一句话回复“对话主链路验证通过”。`
    let sessionId = ''
    try {
      await this.sendPrompt(prompt, account)
      await ChatPage.waitForAssistantFinal(BUSINESS_LLM_TIMEOUT_MS)
      sessionId = await ChatPage.getCurrentSessionId()

      await ChatPage.expectDisclaimer()
      await ChatPage.clickAssistantCopyAndExpectSuccess()
      await ChatPage.clickFeedbackAndExpectSelected('like')
      await ChatPage.clickShareAndExpectCopied()

      await H5Runtime.goto('/chat')
      await ChatPage.waitForLoaded()
      await ChatPage.openDrawer()
      await SideDrawerPage.openLatestSession()
      await ChatPage.waitForLoaded()
      const restoredPath = await H5Runtime.getPathname()
      assert.equal(restoredPath, `/chat/${sessionId}`, `历史恢复未进入原会话：${restoredPath}`)
      await ChatPage.expectUserMessage(prompt)

      await ChatPage.openDrawer()
      await SideDrawerPage.openFirstDeleteSessionConfirm()
      await BusinessWidgetsPage.clickButtonByExactText('删除', 5000)
      await H5Runtime.goto('/chat')
      await ChatPage.waitForLoaded()
      await ChatPage.openDrawer()
      const list = await H5ApiClient.get<SessionListResponse>('/sessions?limit=20')
      assert.equal(list.items.some((item) => item.id === sessionId), false, '删除会话后 /api/sessions 仍返回该 sessionId')
      await SideDrawerPage.close().catch(() => undefined)
      sessionId = ''
    } finally {
      if (sessionId) await H5ApiClient.delete(`/sessions/${sessionId}`).catch(() => undefined)
    }
  }

  static async assertCommunicationCardGenerateSaveToMaterials(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    const prompt = [
      `Android沟通卡闭环${Date.now().toString().slice(-6)}。`,
      '请帮我生成一张下周复诊给医生看的就诊沟通卡，重点是腹泻、食欲下降和是否需要调整用药。',
      '请直接整理成沟通卡，包含就诊目标、我的情况、特别说明、我的问题。',
    ].join('')

    await this.sendPrompt(prompt, account)
    await BusinessWidgetsPage.waitForCommunicationCard(BUSINESS_LLM_TIMEOUT_MS)
    await BusinessWidgetsPage.waitForGenerationIdle(BUSINESS_LLM_TIMEOUT_MS).catch(() => undefined)
    await BusinessWidgetsPage.saveCommunicationCardAndOpenMaterials()
  }

  static async assertInterventionMaterialGenerateSaveToMaterials(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    const prompt = [
      `Android干预跟练闭环${Date.now().toString().slice(-6)}。`,
      '我刚吐完，嘴里发酸，喉咙不舒服；没有持续呕吐，没有喝不进水，没有明显脱水，也没有呼吸困难。',
      '请给我一个现在可以跟练的轻量缓解方案，并展示可跟练卡片。',
    ].join('')

    await this.sendPrompt(prompt, account)
    await BusinessWidgetsPage.waitForInterventionCard(BUSINESS_LLM_TIMEOUT_MS)
    await BusinessWidgetsPage.waitForGenerationIdle(BUSINESS_LLM_TIMEOUT_MS).catch(() => undefined)
    await BusinessWidgetsPage.saveInterventionCardAndOpenMaterials()
  }

  static async assertMedicalProfileApprovalApproveAndVisible(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    await AuthFlow.ensureLoggedIn(account)
    await BusinessWidgetsPage.ensureHealthConsentAccepted()
    // 先把用药状态置为“暂未用药”，避免账号已有来曲唑时模型判断“无需更新”而不出审批卡。
    await H5ApiClient.post('/medical', {
      profileData: {
        medications: ['none'],
        medicationCustom: '',
        medicationDuration: null,
        medicationDurations: {},
      },
    }).catch(() => undefined)

    const prompt = `Android档案审批闭环${Date.now().toString().slice(-6)}：我现在正在服用来曲唑，已经用了3个月，请帮我记录到健康档案。`
    await this.sendPrompt(prompt, account)
    await BusinessWidgetsPage.waitForApprovalCard(BUSINESS_LLM_TIMEOUT_MS)
    await BusinessWidgetsPage.approveProfileUpdate()

    await H5Runtime.goto('/medical-records')
    await MedicalRecordsPage.waitForLoaded()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('来曲唑') || body.includes('用药')
    }, { timeout: 20000, interval: 500, timeoutMsg: '审批同意后健康档案未展示来曲唑/用药信息' })
  }

  static async assertMaterialsCommunicationAndPracticeTabs(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的沟通卡')
    const hasCommunication = await MaterialsPage.hasCommunicationCards()
    await MaterialsPage.selectTab('我的跟练卡')
    const hasPractice = await MaterialsPage.hasPracticeCards()
    if (!hasCommunication || !hasPractice) {
      skipCase(`当前账号材料数据不足：沟通卡=${hasCommunication}, 跟练卡=${hasPractice}。请先跑 CX-BIZ-COMM-001 和 CX-BIZ-INT-001。`)
    }
    await MaterialsPage.openFirstPracticeCard()
    await BusinessWidgetsPage.waitForAnyBodyIncludes(['开始跟练', '继续跟练', '再跟练一次', '仅原会话内可跟练'], 15000)
    await MaterialsPage.backToList()
    await MaterialsPage.selectTab('我的沟通卡')
    await MaterialsPage.openFirstCommunicationCard()
    await BusinessWidgetsPage.waitForBodyIncludes(['就诊目标', '我的情况', '特别说明', '我的问题'], 15000)
  }

  static async assertCommunicationCardDuplicateSaveIdempotency(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    await AuthFlow.ensureLoggedIn(account)
    const suffix = Date.now().toString().slice(-8)
    const session = await H5ApiClient.post<CreatedSession>('/sessions', {
      title: `Android沟通卡幂等保存${suffix}`,
    })
    const draft: CommunicationCardDraft = {
      title: `Android沟通卡幂等-${suffix}`,
      cardDate: new Date().toISOString().slice(0, 10),
      visitPurpose: `幂等保存验证-${suffix}：复诊时确认症状与用药安排。`,
      currentSituation: '这是自动化测试构造的同一工具结果。',
      informationForDoctor: '同一个 sourceSessionId + sourceToolCallId 重复保存不应产生重复卡片。',
      questionsForDoctor: '请确认下一步是否需要调整方案。',
    }
    const payload = {
      draft,
      originalDraft: draft,
      sourceSessionId: session.id,
      sourceToolCallId: `appium-comm-idempotency-${suffix}`,
    }

    await browser.pause(1100)
    const first = await H5ApiClient.post<CommunicationCardRecord>('/medical/communication-cards', payload)
    const second = await H5ApiClient.post<CommunicationCardRecord>('/medical/communication-cards', payload)
    assert.equal(second.id, first.id, '同一 sourceSessionId + sourceToolCallId 重复保存应返回同一张沟通卡')

    const cards = await this.getCommunicationCards()
    const matches = cards.filter((card) => card.title === draft.title && card.sourceSessionId === session.id)
    assert.equal(matches.length, 1, `重复保存后不应产生重复沟通卡，实际 matches=${matches.length}`)

    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的沟通卡')
    await MaterialsPage.openCommunicationCardByTitle(draft.title)
    await MaterialsPage.expectCommunicationCardContains([
      draft.title,
      draft.visitPurpose,
      draft.informationForDoctor ?? '',
      draft.questionsForDoctor ?? '',
    ].filter(Boolean), 15000)
  }

  static async assertCommunicationCardEditSavePersistence(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    const targetCard = await this.openFirstCommunicationCardOrCreate(account)
    const suffix = Date.now().toString().slice(-8)
    const update: CommunicationCardDraft = {
      title: `Android自动化沟通卡编辑-${suffix}`,
      cardDate: new Date().toISOString().slice(0, 10),
      visitPurpose: `自动化编辑就诊目标-${suffix}：复诊时确认腹泻和用药调整。`,
      currentSituation: `自动化编辑我的情况-${suffix}：近两天食欲下降，需要医生综合判断。`,
      informationForDoctor: `自动化编辑特别说明-${suffix}：已记录饮食、排便次数和用药时间。`,
      questionsForDoctor: `自动化编辑我的问题-${suffix}：是否需要调整剂量？是否需要止泻药？`,
    }
    const markers = [
      update.title,
      update.cardDate,
      update.visitPurpose,
      update.currentSituation ?? '',
      update.informationForDoctor ?? '',
      update.questionsForDoctor ?? '',
    ].filter(Boolean)

    await MaterialsPage.saveCommunicationCardEdit(update)
    await MaterialsPage.expectCommunicationCardContains(markers, 15000)

    const updated = await H5ApiClient.get<CommunicationCardRecord>(`/medical/communication-cards/${targetCard.id}`)
    assert.equal(updated.contentJson.draft.title, update.title, '沟通卡标题未通过 API 持久化')
    assert.equal(updated.contentJson.draft.cardDate, update.cardDate, '沟通卡日期未通过 API 持久化')
    assert.equal(updated.contentJson.draft.visitPurpose, update.visitPurpose, '沟通卡“就诊目标”未通过 API 持久化')
    assert.equal(updated.contentJson.draft.currentSituation, update.currentSituation, '沟通卡“我的情况”未通过 API 持久化')
    assert.equal(updated.contentJson.draft.informationForDoctor, update.informationForDoctor, '沟通卡“特别说明”未通过 API 持久化')
    assert.equal(updated.contentJson.draft.questionsForDoctor, update.questionsForDoctor, '沟通卡“我的问题”未通过 API 持久化')

    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的沟通卡')
    await MaterialsPage.openCommunicationCardByTitle(update.title)
    await MaterialsPage.expectCommunicationCardContains(markers, 15000)
  }

  static async assertCommunicationCardEditValidation(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    const targetCard = await this.openFirstCommunicationCardOrCreate(account)
    const original = await H5ApiClient.get<CommunicationCardRecord>(`/medical/communication-cards/${targetCard.id}`)

    await MaterialsPage.expectCommunicationCardEditSaveError({ title: '' }, 'title 不能为空')
    await MaterialsPage.cancelEditCommunicationCard()

    await MaterialsPage.expectCommunicationCardEditSaveError({ cardDate: '2026/05/12' }, 'cardDate 必须是 YYYY-MM-DD')
    await MaterialsPage.cancelEditCommunicationCard()

    await MaterialsPage.expectCommunicationCardEditSaveError({ visitPurpose: '' }, 'visitPurpose 不能为空')
    await MaterialsPage.cancelEditCommunicationCard()

    const after = await H5ApiClient.get<CommunicationCardRecord>(`/medical/communication-cards/${targetCard.id}`)
    assert.deepEqual(after.contentJson.draft, original.contentJson.draft, '沟通卡非法编辑保存失败后不应改动已保存 draft')
  }

  static async assertPracticeCardFollowControlsAndProgress(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    let target = await this.openFirstPracticeCardOrCreate(account)
    await BusinessWidgetsPage.waitForAnyBodyIncludes(
      ['开始跟练', '继续跟练', '再跟练一次', '仅原会话内可跟练'],
      15000,
      '跟练卡详情未展示跟练入口',
    )

    // 历史脏数据如果没有 sessionId/toolCallId，会展示静态卡片“仅原会话内可跟练”；
    // 此时自动生成一张新的可交互跟练卡，保证本用例覆盖真实步骤控制。
    if (!await MaterialsPage.getPracticeStartButtonLabel()) {
      await this.assertInterventionMaterialGenerateSaveToMaterials(account)
      const saved = await this.getSavedInterventionMaterials()
      assert.ok(saved.items[0], '重新生成并保存跟练卡后，/api/intervention-material-runtime/saved 未返回记录')
      target = saved.items[0]
    }

    const firstStep = await MaterialsPage.startPracticeFollow()
    const clickedNext = await MaterialsPage.clickPracticeNextIfAvailable()
    let expectedCompletedStepCount = 0
    if (clickedNext) {
      expectedCompletedStepCount = 1
      await MaterialsPage.waitForPracticeStepAtLeast(Math.min(firstStep.current + 1, firstStep.total), 10000)
    }

    const clickedPrevious = await MaterialsPage.clickPracticePreviousIfAvailable()
    if (clickedNext) {
      assert.equal(clickedPrevious, true, '点击下一步后，“上一步”按钮应可点击')
    }

    await MaterialsPage.replayCurrentPracticeStep()
    await MaterialsPage.returnPracticeOverview()
    const overviewProgress = await MaterialsPage.waitForPracticeOverviewProgressAtLeast(expectedCompletedStepCount, 15000)
    assert.ok(overviewProgress.total >= firstStep.total, `跟练总步数异常：${overviewProgress.raw}`)

    await browser.waitUntil(async () => {
      const saved = await this.getSavedInterventionMaterials().catch(() => ({ items: [] }))
      const updated = saved.items.find((item) => item.engagement.id === target.engagement.id)
      return Boolean(
        updated?.engagement.followStartedAt
          && updated.engagement.completedStepCount >= expectedCompletedStepCount
          && updated.engagement.totalStepCount >= firstStep.total,
      )
    }, {
      timeout: 20000,
      interval: 1000,
      timeoutMsg: '跟练开始/进度未通过 /api/intervention-material-runtime/saved 持久化',
    })

    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.selectTab('我的跟练卡')
    await MaterialsPage.openFirstPracticeCard()
    await MaterialsPage.waitForPracticeOverviewProgressAtLeast(expectedCompletedStepCount, 15000)
  }

  static async assertReadingSettingsAffectBusinessCards(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    await this.openFirstCommunicationCardOrCreate(account)
    await this.openFirstPracticeCardOrCreate(account)

    try {
      await H5Runtime.goto('/reading-settings')
      await ReadingSettingsPage.waitForLoaded()
      await ReadingSettingsPage.select('small')

      await H5Runtime.goto('/materials')
      await MaterialsPage.waitForLoaded()
      await MaterialsPage.selectTab('我的沟通卡')
      await MaterialsPage.openFirstCommunicationCard()
      const smallCommunicationFont = await MaterialsPage.getVisibleTextFontSize('就诊目标')

      await MaterialsPage.backToList()
      await MaterialsPage.selectTab('我的跟练卡')
      await MaterialsPage.openFirstPracticeCard()
      await MaterialsPage.expectPracticeOverview()
      const smallPracticeFont = await MaterialsPage.getVisibleTextFontSize('当前进度')

      await H5Runtime.goto('/reading-settings')
      await ReadingSettingsPage.waitForLoaded()
      await ReadingSettingsPage.select('large')

      await H5Runtime.goto('/materials')
      await MaterialsPage.waitForLoaded()
      await MaterialsPage.selectTab('我的沟通卡')
      await MaterialsPage.openFirstCommunicationCard()
      const largeCommunicationFont = await MaterialsPage.getVisibleTextFontSize('就诊目标')

      await MaterialsPage.backToList()
      await MaterialsPage.selectTab('我的跟练卡')
      await MaterialsPage.openFirstPracticeCard()
      await MaterialsPage.expectPracticeOverview()
      const largePracticeFont = await MaterialsPage.getVisibleTextFontSize('当前进度')

      assert.ok(
        largeCommunicationFont > smallCommunicationFont,
        `沟通卡详情字号未随阅读设置变大：small=${smallCommunicationFont}, large=${largeCommunicationFont}`,
      )
      assert.ok(
        largePracticeFont > smallPracticeFont,
        `跟练卡详情字号未随阅读设置变大：small=${smallPracticeFont}, large=${largePracticeFont}`,
      )
    } finally {
      await H5Runtime.goto('/reading-settings').catch(() => undefined)
      await ReadingSettingsPage.waitForLoaded().catch(() => undefined)
      await ReadingSettingsPage.select('medium').catch(() => undefined)
    }
  }

  static async assertMedicalDocumentDeletePersistence(): Promise<void> {
    const account = TestDataFlow.resolveMedicalPurgeAccount()
    if (!account) {
      skipCase('未配置 TEST_PHONE_MEDICAL_PURGE / 动态清档账号，跳过病历文档删除持久化用例，避免误删普通账号数据')
    }

    await TestDataFlow.ensureCompletedProfile(account)
    await BusinessWidgetsPage.ensureHealthConsentAccepted()
    const docs = await H5ApiClient.get<MedicalDocumentRecord[]>('/medical/documents')
    if (docs.length === 0) {
      skipCase('当前专用账号没有可删除的病历文档；请先通过 OCR/报告保存流程准备文档数据')
    }
    const target = docs.find((doc) => !!doc.title) ?? docs[0]
    if (!target.title) {
      skipCase('当前专用账号首个病历文档无标题，无法稳定按 UI 定位删除')
    }

    await H5Runtime.goto('/medical-records')
    await MedicalRecordsPage.waitForLoaded()
    await MedicalRecordsPage.openDocumentDetailByTitle(target.title)
    await MedicalRecordsPage.deleteCurrentDocumentConfirm()

    const remaining = await H5ApiClient.get<MedicalDocumentRecord[]>('/medical/documents')
    assert.equal(remaining.some((doc) => doc.id === target.id), false, '删除病历后列表 API 仍返回该文档')
    const detailStillAccessible = await H5ApiClient.get<MedicalDocumentRecord>(`/medical/documents/${target.id}`)
      .then(() => true)
      .catch(() => false)
    assert.equal(detailStillAccessible, false, '删除病历后旧详情 API 仍可访问')
    await H5Runtime.reload()
    await MedicalRecordsPage.waitForLoaded()
    const body = await H5Runtime.getBodyText()
    assert.equal(body.includes(target.title), false, '删除病历刷新后页面仍展示旧文档标题')
  }

  static async assertHiddenMedicalFieldPatchRejected(account: TestAccount = accounts.normal): Promise<void> {
    account = this.resolveBusinessAccount(account)
    await AuthFlow.ensureLoggedIn(account)
    await BusinessWidgetsPage.ensureHealthConsentAccepted()
    try {
      await H5ApiClient.put('/medical/profile', {
        nickname: `字段边界${Date.now().toString().slice(-6)}`,
        birthday: '1990-01-01',
        gender: '男',
        currentConcern: 'breast_tumor_care',
      })

      const rejected = await H5ApiClient.post('/medical/profile/patch', {
        field: 'menstrualStatus',
        value: 'postmenopausal',
      }).then(() => false).catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        return message.includes('当前关注情况不允许更新字段') || message.includes('menstrualStatus')
      })
      assert.equal(rejected, true, '男性账号隐藏的“月经状态”字段不应允许通过 profile/patch 更新')

      const profile = await H5ApiClient.get<{
        medical?: { profileData?: { menstrualStatus?: string } | null } | null
      }>('/medical')
      assert.notEqual(profile.medical?.profileData?.menstrualStatus, 'postmenopausal', '隐藏字段被错误写入健康档案')
    } finally {
      await H5ApiClient.put('/medical/profile', {
        nickname: `自动化测试${account.phone.slice(-4)}`,
        birthday: '1990-01-01',
        gender: '女',
        currentConcern: 'breast_tumor_care',
      }).catch(() => undefined)
    }
  }
}
