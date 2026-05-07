import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { MaterialsFastFlow } from '../flows/materials-fast.flow.js'
import { MedicalFastFlow } from '../flows/medical-fast.flow.js'

const account = accounts.normal

describe('材料、健康档案与 OCR 入口 fast 验证', () => {
  itCase('CX-MAT-001', '我的材料页面进入', { tags: ['materials', 'p1'] }, async () => {
    await MaterialsFastFlow.assertEntry(account)
  })

  itCase('CX-MAT-002', '沟通卡空状态', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationEmptyOrSkip(account)
  })

  itCase('CX-MAT-009', '我的材料返回聊天', { tags: ['materials', 'p1'] }, async () => {
    await MaterialsFastFlow.assertBackToChat(account)
  })

  itCase('CX-MAT-010', '我的材料 Tab 切换', { tags: ['materials', 'p1'] }, async () => {
    await MaterialsFastFlow.assertTabSwitch(account)
  })

  itCase('CX-MAT-017', '我的材料返回原会话并打开侧栏', { tags: ['materials', 'p1'] }, async () => {
    await MaterialsFastFlow.assertBackToSidebar(account)
  })

  itCase('CX-MAT-003', '沟通卡列表展示', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationList(account)
  })

  itCase('CX-MAT-004', '查看沟通卡详情', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationDetail(account)
  })

  itCase('CX-MAT-005', '编辑沟通卡入口', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationEditAndCancel(account)
  })

  itCase('CX-MAT-006', '保存修改沟通卡', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationSaveModification(account)
  })

  itCase('CX-MAT-007', '取消编辑沟通卡', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationEditAndCancel(account)
  })

  itCase('CX-MAT-008', '沟通卡详情返回列表', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationBackToList(account)
  })

  itCase('CX-MAT-012', '跟练卡列表展示', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertPracticeList(account)
  })

  itCase('CX-MAT-011', '跟练卡空状态', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertPracticeEmptyOrSkip(account)
  })

  itCase('CX-MAT-013', '查看跟练卡详情', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertPracticeDetail(account)
  })

  itCase('CX-MAT-016', '沟通卡编辑取消恢复', { tags: ['materials', 'conditional', 'p1'] }, async () => {
    await MaterialsFastFlow.assertCommunicationEditAndCancel(account)
  })

  itCase('CX-CONSENT-001', '首次进入健康档案授权弹窗', { tags: ['consent', 'conditional', 'p0'] }, async () => {
    await MedicalFastFlow.assertConsentDialogOrSkip(account)
  })

  itCase('CX-CONSENT-003', '不同意健康档案授权返回对话', { tags: ['consent', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertRejectConsentOrSkip(account)
  })

  itCase('CX-CONSENT-002', '同意健康档案授权后进入健康档案页', { tags: ['consent', 'p0'] }, async () => {
    await MedicalFastFlow.assertAcceptConsent(account)
  })

  itCase('CX-CONSENT-004', '已授权进入健康档案不再弹窗', { tags: ['consent', 'p1'] }, async () => {
    await MedicalFastFlow.assertConsentPersisted(account)
  })

  itCase('CX-CONSENT-006', '本地授权丢失后远端同步', { tags: ['consent', 'p1'] }, async () => {
    await MedicalFastFlow.assertRemoteConsentSync(account)
  })

  itCase('CX-MED-001', '健康档案页面加载', { tags: ['medical', 'p0'] }, async () => {
    await MedicalFastFlow.assertMedicalPage(account)
  })

  itCase('CX-MED-002', '健康档案返回对话', { tags: ['medical', 'p0'] }, async () => {
    await MedicalFastFlow.assertBackToChat(account)
  })

  itCase('CX-MED-003', '病历档案卡片展示', { tags: ['medical', 'p0'] }, async () => {
    await MedicalFastFlow.assertMedicalProfileCard(account)
  })

  itCase('CX-MED-004', '病历档案编辑入口', { tags: ['medical', 'p0'] }, async () => {
    await MedicalFastFlow.assertEditAndCancel(account)
  })

  itCase('CX-MED-017', '病历档案保存修改', { tags: ['medical', 'p0'] }, async () => {
    await MedicalFastFlow.assertSaveModification(account)
  })

  itCase('CX-MED-018', '病历档案多字段保存', { tags: ['medical', 'p1'] }, async () => {
    await MedicalFastFlow.assertMultiFieldSave(account)
  })

  itCase('CX-MED-019', '男性隐藏月经状态', { tags: ['medical', 'p1'] }, async () => {
    await MedicalFastFlow.assertMaleHidesMenstrual(account)
  })

  itCase('CX-MED-020', '不同关注情况字段变化', { tags: ['medical', 'p1'] }, async () => {
    await MedicalFastFlow.assertConcernFieldVariation(account)
  })

  itCase('CX-MED-005', '病历档案取消编辑', { tags: ['medical', 'p0'] }, async () => {
    await MedicalFastFlow.assertEditAndCancel(account)
  })

  itCase('CX-MED-006', '月经状态选择', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertMenstrualStatusOrSkip(account)
  })

  itCase('CX-MED-007', '肿瘤分型选择', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertTumorTypeOrSkip(account)
  })

  itCase('CX-MED-008', '确诊时长选择', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertDiagnosisDurationOrSkip(account)
  })

  itCase('CX-MED-009', '治疗阶段选择', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertTreatmentPhaseOrSkip(account)
  })

  itCase('CX-MED-010', '用药情况选择', { tags: ['medical', 'conditional', 'p0'] }, async () => {
    await MedicalFastFlow.assertMedicationSelectOrSkip(account)
  })

  itCase('CX-MED-011', '自定义用药添加', { tags: ['medical', 'conditional', 'p0'] }, async () => {
    await MedicalFastFlow.assertCustomMedicationOrSkip(account)
  })

  itCase('CX-MED-012', '自定义用药 Emoji 展示', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertEmojiMedicationOrSkip(account)
  })

  itCase('CX-MED-013', '自定义药名超长提示', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertLongCustomMedicationOrSkip(account)
  })

  itCase('CX-MED-014', '暂未用药选项', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertMedicationNoneOrSkip(account)
  })

  itCase('CX-MED-015', '不确定用药选项', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertMedicationUncertainOrSkip(account)
  })

  itCase('CX-MED-016', '用药时长选择', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertMedicationDurationOrSkip(account)
  })

  itCase('CX-MED-022', 'MVP 单档案限制', { tags: ['medical', 'p1'] }, async () => {
    await MedicalFastFlow.assertSingleProfileLimit(account)
  })

  itCase('CX-MED-026', '清空不影响个人信息授权对话', { tags: ['medical', 'account-security', 'destructive', 'p1'] }, async () => {
    await MedicalFastFlow.assertClearKeepsProfileConsentAndHistory(account)
  })

  itCase('CX-MED-029', '关注情况切换隐藏旧扩展字段', { tags: ['medical', 'profile', 'p1'] }, async () => {
    await MedicalFastFlow.assertConcernSwitchHidesOldExtension(account)
  })

  itCase('CX-MED-030', '自定义用药分隔去重', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertCustomMedicationDedupOrSkip(account)
  })

  itCase('CX-MED-031', '未点添加的自定义药随保存提交', { tags: ['medical', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertPendingCustomMedicationSaved(account)
  })

  itCase('CX-MED-033', '折叠/取消丢弃未保存变更并退出编辑态', { tags: ['medical', 'p1'] }, async () => {
    await MedicalFastFlow.assertEditAndCancel(account)
  })

  itCase('CX-OCR-001', '进入上传病历页', { tags: ['ocr', 'p0'] }, async () => {
    await MedicalFastFlow.assertUploadEntry(account)
  })

  itCase('CX-OCR-002', '上传病历页元素展示', { tags: ['ocr', 'p0'] }, async () => {
    await MedicalFastFlow.assertUploadElements(account)
  })

  itCase('CX-OCR-003', '取消上传病历', { tags: ['ocr', 'p0'] }, async () => {
    await MedicalFastFlow.assertCancelUpload(account)
  })

  itCase('CX-OCR-004', '选择图片预览', { tags: ['ocr', 'p0'] }, async () => {
    await MedicalFastFlow.assertUploadImagePreview(account)
  })

  itCase('CX-OCR-005', '删除图片', { tags: ['ocr', 'p1'] }, async () => {
    await MedicalFastFlow.assertUploadImageDelete(account)
  })

  itCase('CX-OCR-006', '开始识别按钮', { tags: ['ocr', 'p0'] }, async () => {
    await MedicalFastFlow.assertStartOcrButton(account)
  })

  itCase('CX-OCR-007', '病历上传不支持格式', { tags: ['ocr', 'p0'] }, async () => {
    await MedicalFastFlow.assertUnsupportedUploadFormat(account)
  })

  itCase('CX-OCR-008', '病历上传单张超过 10MB', { tags: ['ocr', 'p1'] }, async () => {
    await MedicalFastFlow.assertOversizeUploadImage(account)
  })

  itCase('CX-OCR-009', '病历上传最多 10 张', { tags: ['ocr', 'p1'] }, async () => {
    await MedicalFastFlow.assertUploadImageCountLimit(account)
  })

  itCase('CX-OCR-014', '查看病历文档详情', { tags: ['ocr', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertDocumentDetailOrSkip(account)
  })

  itCase('CX-OCR-015', '病历文档图片预览', { tags: ['ocr', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertDocumentImagePreviewOrSkip(account)
  })

  itCase('CX-OCR-022', '删除文档二次确认取消', { tags: ['ocr', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertDocumentDeleteCancelOrSkip(account)
  })

  itCase('CX-OCR-024', '详情大图关闭与切换', { tags: ['ocr', 'conditional', 'p1'] }, async () => {
    await MedicalFastFlow.assertDocumentLightboxSwitchCloseOrSkip(account)
  })
})
