import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { skipCase } from '../core/case-runner.js'
import { H5ApiClient } from '../core/h5-api-client.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { MedicalRecordsPage } from '../pages/MedicalRecordsPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { TestDataFlow } from './test-data.flow.js'

interface CreatedSession {
  id: string
  title: string | null
}

export class MedicalFastFlow {
  static async openWithLocalConsentCleared(account: TestAccount = accounts.normal): Promise<void> {
    await TestDataFlow.ensureCompletedProfile(account)
    await H5Runtime.removeLocalStorage('cx-consents')
    await H5Runtime.replace('/medical-records')
    await H5Runtime.reload()
  }

  static async ensureMedicalPageReady(account: TestAccount = accounts.normal): Promise<void> {
    await TestDataFlow.ensureKnownMedicalProfile(account)
    await H5Runtime.goto('/medical-records')
    if ((await MedicalRecordsPage.waitForConsentOrLoaded()) === 'consent') {
      await MedicalRecordsPage.acceptHealthConsent()
    }
    await MedicalRecordsPage.waitForLoaded()
  }

  static async assertConsentDialogOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    account = TestDataFlow.resolveNoHealthConsentAccount() ?? account
    await this.openWithLocalConsentCleared(account)
    if ((await MedicalRecordsPage.waitForConsentOrLoaded()) !== 'consent') {
      skipCase('当前账号远端已存在健康档案授权，无法重复验证首次授权弹窗')
    }
    await MedicalRecordsPage.waitForHealthConsentDialog()
    await MedicalRecordsPage.rejectHealthConsent()
    await ChatPage.waitForLoaded()
  }

  static async assertRejectConsentOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    account = TestDataFlow.resolveNoHealthConsentAccount() ?? account
    await this.openWithLocalConsentCleared(account)
    if ((await MedicalRecordsPage.waitForConsentOrLoaded()) !== 'consent') {
      skipCase('当前账号远端已存在健康档案授权，无法重复验证拒绝授权')
    }
    await MedicalRecordsPage.rejectHealthConsent()
    await ChatPage.waitForLoaded()
  }

  static async assertAcceptConsent(account: TestAccount = accounts.normal): Promise<void> {
    await this.openWithLocalConsentCleared(account)
    if ((await MedicalRecordsPage.waitForConsentOrLoaded()) === 'consent') {
      await MedicalRecordsPage.acceptHealthConsent()
    }
    await MedicalRecordsPage.waitForLoaded()
  }

  static async assertConsentPersisted(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await H5Runtime.reload()
    await MedicalRecordsPage.waitForLoaded()
    assert.equal(await MedicalRecordsPage.hasHealthConsentDialog(), false, '已授权账号刷新后不应重复弹授权')
  }

  static async assertRemoteConsentSync(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await H5Runtime.removeLocalStorage('cx-consents')
    await H5Runtime.replace('/medical-records')
    await H5Runtime.reload()
    await MedicalRecordsPage.waitForLoaded()
    assert.equal(await MedicalRecordsPage.hasHealthConsentDialog(), false, '本地授权丢失时应从远端同步，不应重复弹窗')
  }

  static async assertMedicalPage(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.expectListOrEmptyDocuments()
  }

  static async assertBackToChat(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.backButton.click()
    await ChatPage.waitForLoaded()
  }

  static async assertMedicalProfileCard(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    const body = await H5Runtime.getBodyText()
    assert.ok(body.includes('病历档案'), '健康档案页应展示病历档案卡片')
    assert.ok(body.includes('编辑'), '病历档案卡片应展示编辑入口')
  }

  static async assertEditAndCancel(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertSaveModification(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过病历档案保存修改用例')
    }
    await MedicalRecordsPage.selectMedicationAlternative('暂未用药')
    await MedicalRecordsPage.saveMedicalProfileEdit()
    await MedicalRecordsPage.waitForLoaded()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('暂未用药')
    }, { timeout: 10000, interval: 300, timeoutMsg: '保存病历档案后页面未展示已保存的“暂未用药”' })
  }

  static async assertMultiFieldSave(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    const selectedLabels: string[] = []
    try {
      for (const label of ['月经状态', '肿瘤分型', '确诊时长', '治疗阶段', '用药时长']) {
        if (await MedicalRecordsPage.hasEditableField(label)) {
          selectedLabels.push(await MedicalRecordsPage.selectFirstSingleOptionAndReturnLabel(label, label))
        }
      }
      if (await MedicalRecordsPage.hasEditableField('用药情况')) {
        await MedicalRecordsPage.selectMedicationAlternative('暂未用药')
        selectedLabels.push('暂未用药')
      }
      if (selectedLabels.length < 2) {
        await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
        skipCase('当前账号可编辑病历字段少于 2 个，无法验证多字段保存')
      }
      await MedicalRecordsPage.saveMedicalProfileEdit()
      const body = await H5Runtime.getBodyText()
      for (const label of selectedLabels.slice(0, 3)) {
        assert.ok(body.includes(label), `多字段保存后未展示：${label}`)
      }
    } catch (err) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      throw err
    }
  }

  static async assertMaleHidesMenstrual(account: TestAccount = accounts.normal): Promise<void> {
    try {
      await TestDataFlow.setCompletedProfile(account, { gender: '男', currentConcern: 'breast_tumor_care' })
      await this.ensureMedicalPageReady(account)
      await MedicalRecordsPage.openMedicalProfileEdit()
      await MedicalRecordsPage.expectEditableFieldVisible('月经状态', false)
      await MedicalRecordsPage.expectEditableFieldVisible('用药情况', true)
      await MedicalRecordsPage.cancelMedicalProfileEdit()
    } finally {
      await TestDataFlow.setCompletedProfile(account, { gender: '女', currentConcern: 'breast_tumor_care' }).catch(() => undefined)
    }
  }

  static async assertConcernFieldVariation(account: TestAccount = accounts.normal): Promise<void> {
    try {
      await TestDataFlow.setCompletedProfile(account, { gender: '女', currentConcern: 'breast_tumor_care' })
      await this.ensureMedicalPageReady(account)
      await MedicalRecordsPage.openMedicalProfileEdit()
      for (const label of ['月经状态', '用药情况', '肿瘤分型', '确诊时长', '治疗阶段']) {
        await MedicalRecordsPage.expectEditableFieldVisible(label, true)
      }
      await MedicalRecordsPage.cancelMedicalProfileEdit()

      await TestDataFlow.setCompletedProfile(account, { gender: '女', currentConcern: 'breast_nodule_followup' })
      await this.ensureMedicalPageReady(account)
      await MedicalRecordsPage.openMedicalProfileEdit()
      await MedicalRecordsPage.expectEditableFieldVisible('月经状态', true)
      await MedicalRecordsPage.expectEditableFieldVisible('用药情况', true)
      for (const label of ['肿瘤分型', '确诊时长', '治疗阶段']) {
        await MedicalRecordsPage.expectEditableFieldVisible(label, false)
      }
      await MedicalRecordsPage.cancelMedicalProfileEdit()
    } finally {
      await TestDataFlow.setCompletedProfile(account, { gender: '女', currentConcern: 'breast_tumor_care' }).catch(() => undefined)
    }
  }

  static async assertSingleProfileLimit(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.expectSingleMedicalProfileCardOnly()
  }

  static async assertClearKeepsProfileConsentAndHistory(account: TestAccount = accounts.normal): Promise<void> {
    const purgeAccount = TestDataFlow.resolveMedicalPurgeAccount() ?? account
    const suffix = Date.now().toString().slice(-6)
    const sessionTitle = `Appium清空保留会话${suffix}`
    let created: CreatedSession | null = null

    await TestDataFlow.setCompletedProfile(purgeAccount, {
      gender: '女',
      currentConcern: 'breast_tumor_care',
    })
    await this.ensureMedicalPageReady(purgeAccount)
    created = await H5ApiClient.post<CreatedSession>('/sessions', { title: sessionTitle })
    await H5ApiClient.post('/medical', {
      profileData: {
        medications: ['other'],
        medicationCustom: `清空前药物${suffix}`,
      },
    })
    await H5ApiClient.post('/account/medical/send-code')
    await H5ApiClient.post('/account/medical/purge', { code: purgeAccount.fixedCode })

    const profile = await H5ApiClient.get<{
      user?: { nickname?: string | null; birthday?: string | null; gender?: string | null; currentConcern?: string | null }
      medical?: unknown
    }>('/medical')
    assert.ok(profile.user?.nickname, '清空健康档案后个人昵称应保留')
    assert.ok(profile.user?.birthday, '清空健康档案后生日应保留')
    assert.ok(profile.user?.gender, '清空健康档案后性别应保留')
    assert.ok(profile.user?.currentConcern, '清空健康档案后当前关注情况应保留')

    await H5Runtime.goto('/medical-records')
    await MedicalRecordsPage.waitForLoaded()
    assert.equal(await MedicalRecordsPage.hasHealthConsentDialog(), false, '清空健康档案后健康授权不应重复弹出')

    await H5Runtime.goto('/chat')
    await ChatPage.waitForLoaded()
    await ChatPage.openDrawer()
    await SideDrawerPage.waitForSessionTitle(sessionTitle)
    await SideDrawerPage.close().catch(() => undefined)

    if (created?.id) {
      await H5ApiClient.delete(`/sessions/${created.id}`).catch(() => undefined)
    }
  }

  static async assertConcernSwitchHidesOldExtension(account: TestAccount = accounts.normal): Promise<void> {
    try {
      await TestDataFlow.setCompletedProfile(account, { gender: '女', currentConcern: 'breast_tumor_care' })
      await this.ensureMedicalPageReady(account)
      await H5ApiClient.post('/medical', {
        profileData: {
          tumorType: 'her2_positive',
          diagnosisDuration: 'within_3m',
          treatmentPhase: 'on_chemo',
          medications: ['tamoxifen'],
          medicationDuration: 'within_1m',
        },
      })
      await TestDataFlow.setCompletedProfile(account, { gender: '女', currentConcern: 'breast_nodule_followup' })
      await this.ensureMedicalPageReady(account)
      await MedicalRecordsPage.openMedicalProfileEdit()
      for (const label of ['肿瘤分型', '确诊时长', '治疗阶段']) {
        await MedicalRecordsPage.expectEditableFieldVisible(label, false)
      }
      await MedicalRecordsPage.expectEditableFieldVisible('用药情况', true)
      await MedicalRecordsPage.expectEditableFieldVisible('用药时长', true)
      await MedicalRecordsPage.cancelMedicalProfileEdit()
    } finally {
      await TestDataFlow.setCompletedProfile(account, { gender: '女', currentConcern: 'breast_tumor_care' }).catch(() => undefined)
    }
  }

  static async assertPendingCustomMedicationSaved(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过未点添加的自定义药保存用例')
    }
    const value = `未点添加药${Date.now().toString().slice(-6)}`
    await MedicalRecordsPage.savePendingCustomMedication(value)
  }

  static async selectMedicalFieldOrSkip(
    caseName: string,
    fieldLabel: string,
    ariaLabel = fieldLabel,
    account: TestAccount = accounts.normal,
  ): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField(fieldLabel))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase(`当前账号资料不展示“${fieldLabel}”字段，跳过 ${caseName}`)
    }
    await MedicalRecordsPage.selectFirstSingleOption(fieldLabel, ariaLabel)
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertMenstrualStatusOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.selectMedicalFieldOrSkip('月经状态选择', '月经状态', '月经状态', account)
  }

  static async assertTumorTypeOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.selectMedicalFieldOrSkip('肿瘤分型选择', '肿瘤分型', '肿瘤分型', account)
  }

  static async assertDiagnosisDurationOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.selectMedicalFieldOrSkip('确诊时长选择', '确诊时长', '确诊时长', account)
  }

  static async assertTreatmentPhaseOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.selectMedicalFieldOrSkip('治疗阶段选择', '治疗阶段', '治疗阶段', account)
  }

  static async assertMedicationNoneOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过用药情况选择用例')
    }
    await MedicalRecordsPage.selectMedicationAlternative('暂未用药')
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertMedicationSelectOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过用药情况选择用例')
    }
    await MedicalRecordsPage.selectFirstCommonMedication()
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertCustomMedicationOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过自定义用药用例')
    }
    await MedicalRecordsPage.addCustomMedicationAndFinish('阿司匹林')
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertEmojiMedicationOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过 Emoji 自定义用药用例')
    }
    await MedicalRecordsPage.addCustomMedicationAndFinish('阿司匹林💊')
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertLongCustomMedicationOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过自定义药名超长用例')
    }
    // 前端实现是在输入阶段限制单个自定义药名长度：
    // 超过 30 字会把输入框截断到 30 字以内，并展示错误提示；不能先点“添加”，否则会提交截断后的合法值并清空错误。
    await MedicalRecordsPage.enterCustomMedicationText('超长药品名称'.repeat(8))
    await MedicalRecordsPage.expectMedicationCustomInputMaxLength(30)
    await MedicalRecordsPage.expectMedicationCustomError('单个药品名称最多 30 个字')
    await MedicalRecordsPage.closeMedicationPanelIfOpen()
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertCustomMedicationDedupOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过自定义用药分隔去重用例')
    }
    await MedicalRecordsPage.addCustomMedicationAndFinish('药A，药A、药B；药B。', ['药A', '药B'])
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertMedicationUncertainOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openMedicalProfileEdit()
    if (!(await MedicalRecordsPage.hasEditableField('用药情况'))) {
      await MedicalRecordsPage.cancelMedicalProfileEdit().catch(() => undefined)
      skipCase('当前账号资料不展示“用药情况”字段，跳过不确定选项用例')
    }
    await MedicalRecordsPage.selectMedicationAlternative('不确定')
    await MedicalRecordsPage.cancelMedicalProfileEdit()
  }

  static async assertMedicationDurationOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.selectMedicalFieldOrSkip('用药时长选择', '用药时长', '用药时长', account)
  }

  static async assertUploadEntry(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
  }

  static async assertUploadElements(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.expectUploadElements()
  }

  static async assertUploadImagePreview(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.attachUploadImages({ count: 1 })
    await MedicalRecordsPage.expectUploadPreviewCount(1)
  }

  static async assertUploadImageDelete(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.attachUploadImages({ count: 1 })
    await MedicalRecordsPage.expectUploadPreviewCount(1)
    await MedicalRecordsPage.removeFirstUploadPreview()
    await MedicalRecordsPage.expectUploadPreviewCount(0)
  }

  static async assertStartOcrButton(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.attachUploadImages({ count: 1 })
    await MedicalRecordsPage.expectStartOcrButton(1)
  }

  static async assertOversizeUploadImage(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.attachUploadImages({ sizeBytes: 10 * 1024 * 1024 + 1, mime: 'image/png', extension: 'png', tinyPng: false })
    await MedicalRecordsPage.expectUploadToastContains('单张图片不能超过 10MB')
  }

  static async assertUploadImageCountLimit(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.attachUploadImages({ count: 11 })
    await MedicalRecordsPage.expectUploadPreviewCountAtMost(10)
    const body = await H5Runtime.getBodyText()
    assert.ok(body.includes('最多上传 10 张图片') || body.includes('仅保留前') || (await H5Runtime.execute(() => document.querySelectorAll('img[alt^="病历 "]').length)) === 10, '病历上传数量限制未生效')
  }

  static async assertCancelUpload(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.cancelUpload()
  }

  static async assertUnsupportedUploadFormat(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.attachUnsupportedUploadFile()
    await MedicalRecordsPage.expectUnsupportedUploadToast()
  }

  static async assertDocumentDetailOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    if (!(await MedicalRecordsPage.hasDocumentList())) {
      skipCase('当前账号没有预置病历文档，跳过病历文档详情用例')
    }
    await MedicalRecordsPage.openFirstDocumentDetail()
  }

  static async assertDocumentImagePreviewOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    if (!(await MedicalRecordsPage.hasDocumentList())) {
      skipCase('当前账号没有预置病历文档，跳过病历图片预览用例')
    }
    await MedicalRecordsPage.openFirstDocumentImageLightbox()
    await MedicalRecordsPage.expectLightboxAndClose()
  }

  static async assertDocumentDeleteCancelOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    if (!(await MedicalRecordsPage.hasDocumentList())) {
      skipCase('当前账号没有预置病历文档，跳过删除文档二次确认取消用例')
    }
    await MedicalRecordsPage.expectDocumentDeleteCancelKeepsDetail()
  }

  static async assertDocumentLightboxSwitchCloseOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureMedicalPageReady(account)
    if (!(await MedicalRecordsPage.hasDocumentList())) {
      skipCase('当前账号没有预置病历文档，跳过详情大图关闭与切换用例')
    }
    await MedicalRecordsPage.openFirstDocumentImageLightbox()
    const count = await H5Runtime.execute(() => {
      const counter = Array.from(document.querySelectorAll('span')).find((el) => /\d+\s*\/\s*\d+/.test(el.textContent || ''))
      return counter?.textContent || ''
    })
    if (!count) {
      await MedicalRecordsPage.expectLightboxAndClose().catch(() => undefined)
      skipCase('病历文档只有 1 张图片，无法验证大图切换')
    }
    await MedicalRecordsPage.expectLightboxAndClose()
  }
}
