import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { BusinessLlmFlow } from '../flows/business-llm.flow.js'

const account = accounts.business
const BUSINESS_CASE_TIMEOUT_MS = Number(process.env.BUSINESS_CASE_TIMEOUT_MS || 600000)

describe('Android WebView 完整业务闭环（APP 内部真实模型链路）', function () {
  this.timeout(BUSINESS_CASE_TIMEOUT_MS)

  itCase('CX-BIZ-AUTH-001', '新用户首登、完善资料并完成首轮对话', { tags: ['android', 'business', 'llm', 'auth', 'p0'] }, async () => {
    await BusinessLlmFlow.assertNewUserFirstActivationToFirstChat()
  })

  itCase('CX-BIZ-CHAT-001', '发送消息到历史恢复、反馈、分享和删除', { tags: ['android', 'business', 'llm', 'chat', 'p0'] }, async () => {
    await BusinessLlmFlow.assertChatFeedbackShareHistoryDelete(account)
  })

  itCase('CX-BIZ-COMM-001', '聊天内生成沟通卡并保存到我的材料', { tags: ['android', 'business', 'llm', 'communication-card', 'p0'] }, async () => {
    await BusinessLlmFlow.assertCommunicationCardGenerateSaveToMaterials(account)
  })

  itCase('CX-BIZ-COMM-003', '同一工具结果重复保存沟通卡保持幂等', { tags: ['android', 'business', 'communication-card', 'materials', 'p1'] }, async () => {
    await BusinessLlmFlow.assertCommunicationCardDuplicateSaveIdempotency(account)
  })

  itCase('CX-BIZ-INT-001', '聊天触发干预方案并保存到我的材料', { tags: ['android', 'business', 'llm', 'intervention-material', 'p0'] }, async () => {
    await BusinessLlmFlow.assertInterventionMaterialGenerateSaveToMaterials(account)
  })

  itCase('CX-BIZ-PROFILE-001', '医疗字段审批同意后落库并在健康档案可见', { tags: ['android', 'business', 'llm', 'profile-approval', 'p0'] }, async () => {
    await BusinessLlmFlow.assertMedicalProfileApprovalApproveAndVisible(account)
  })

  itCase('CX-BIZ-MATERIALS-001', '沟通卡和跟练卡双 Tab 管理闭环', { tags: ['android', 'business', 'materials', 'p1'] }, async () => {
    await BusinessLlmFlow.assertMaterialsCommunicationAndPracticeTabs(account)
  })

  itCase('CX-BIZ-COMM-004', '已保存沟通卡可编辑详细内容并保存持久化', { tags: ['android', 'business', 'communication-card', 'materials', 'p1'] }, async () => {
    await BusinessLlmFlow.assertCommunicationCardEditSavePersistence(account)
  })

  itCase('CX-BIZ-COMM-007', '沟通卡编辑非法输入应拦截且不污染已保存内容', { tags: ['android', 'business', 'communication-card', 'materials', 'validation', 'p1'] }, async () => {
    await BusinessLlmFlow.assertCommunicationCardEditValidation(account)
  })

  itCase('CX-BIZ-INT-002', '跟练卡开始跟练、步骤控制与进度持久化', { tags: ['android', 'business', 'intervention-material', 'materials', 'p1'] }, async () => {
    await BusinessLlmFlow.assertPracticeCardFollowControlsAndProgress(account)
  })

  itCase('CX-BIZ-OCR-002', '删除病历文档后刷新和旧详情不可访问', { tags: ['android', 'business', 'ocr', 'medical-records', 'destructive', 'conditional', 'p1'] }, async () => {
    await BusinessLlmFlow.assertMedicalDocumentDeletePersistence()
  })

  itCase('CX-BIZ-PROFILE-005', '隐藏健康档案字段不可通过审批接口绕过更新', { tags: ['android', 'business', 'profile', 'medical-records', 'validation', 'p1'] }, async () => {
    await BusinessLlmFlow.assertHiddenMedicalFieldPatchRejected(account)
  })

  itCase('CX-BIZ-READ-001', '阅读设置影响聊天、沟通卡和跟练卡详情字号', { tags: ['android', 'business', 'reading', 'materials', 'p1'] }, async () => {
    await BusinessLlmFlow.assertReadingSettingsAffectBusinessCards(account)
  })
})
