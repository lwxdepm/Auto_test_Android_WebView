import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { ProfileFastFlow } from '../flows/profile-fast.flow.js'
import { AccountSecurityFlow } from '../flows/account-security.flow.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'

const account = accounts.normal
const needsProfileAccount = accounts.needsProfile

describe('个人信息与账号安全 fast 验证', () => {
  itCase('CX-PROFILE-001', '首次登录跳转个人信息', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertFirstLoginRedirect(needsProfileAccount)
  })

  itCase('CX-PROFILE-002', '个人信息页面元素展示', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertElements(account)
  })

  itCase('CX-PROFILE-004', '昵称输入可编辑', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertNicknameInput(account)
  })

  itCase('CX-PROFILE-003', '必填为空校验', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertRequiredEmptyValidation(needsProfileAccount)
  })

  itCase('CX-PROFILE-005', '出生日期选择器可打开并确认', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertBirthdayPicker(account)
  })

  itCase('CX-PROFILE-006', '当前关注情况可选择', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertConcernSelect(account)
  })

  itCase('CX-PROFILE-007', '性别可选择', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertGenderSelect(account)
  })

  itCase('CX-PROFILE-008', '完整保存', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertCompleteRequiredProfileSave(needsProfileAccount)
  })

  itCase('CX-PROFILE-009', '非首次资料页展示跳过入口', { tags: ['profile', 'p1'] }, async () => {
    await ProfileFastFlow.assertOptionalCanSkip(account)
  })

  itCase('CX-PROFILE-010', '跳过进入对话', { tags: ['profile', 'p1'] }, async () => {
    await ProfileFastFlow.assertSkipToChat(account)
  })

  itCase('CX-PROFILE-011', '编辑模式返回 Chat', { tags: ['profile', 'p1'] }, async () => {
    await ProfileFastFlow.assertEditBack(account)
  })

  itCase('CX-PROFILE-012', '编辑保存', { tags: ['profile', 'p1'] }, async () => {
    await ProfileFastFlow.assertEditSave(account)
  })

  itCase('CX-PROFILE-013', '首次强制资料不可跳过', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertRequiredCannotSkip(needsProfileAccount)
  })

  itCase('CX-PROFILE-014', '首次部分保存拦截', { tags: ['profile', 'p0'] }, async () => {
    await ProfileFastFlow.assertRequiredPartialSaveBlocked(needsProfileAccount)
  })

  itCase('CX-PROFILE-015', '带 returnSessionId 返回原会话并打开侧栏', { tags: ['profile', 'p1'] }, async () => {
    await ProfileFastFlow.assertReturnSessionBackToSidebar(account)
    await SideDrawerPage.close()
  })

  itCase('CX-PROFILE-016', '关注情况改变联动健康档案字段', { tags: ['profile', 'medical', 'p1'] }, async () => {
    await ProfileFastFlow.assertConcernChangeAffectsMedicalFields(account)
  })

  itCase('CX-SEC-001', '账号与安全页面进入', { tags: ['account-security', 'p1'] }, async () => {
    await AccountSecurityFlow.assertEntry(account)
  })

  itCase('CX-SEC-002', '账号与安全返回个人信息', { tags: ['account-security', 'p1'] }, async () => {
    await AccountSecurityFlow.assertBackToProfile(account)
  })

  itCase('CX-SEC-003', '打开清空健康档案弹窗', { tags: ['account-security', 'p1'] }, async () => {
    await AccountSecurityFlow.assertOpenAndCancelClearDialog(account)
  })

  itCase('CX-SEC-004', '取消清空健康档案弹窗', { tags: ['account-security', 'p1'] }, async () => {
    await AccountSecurityFlow.assertOpenAndCancelClearDialog(account)
  })

  itCase('CX-SEC-006', '打开注销账号流程', { tags: ['account-security', 'p2'] }, async () => {
    await AccountSecurityFlow.assertOpenAndCancelDeleteDialog(account)
  })

  itCase('CX-SEC-007', '取消注销账号流程', { tags: ['account-security', 'p2'] }, async () => {
    await AccountSecurityFlow.assertOpenAndCancelDeleteDialog(account)
  })

  itCase('CX-SEC-009', '发送清空验证码与倒计时', { tags: ['account-security', 'medical-purge', 'p1'] }, async () => {
    await AccountSecurityFlow.assertClearMedicalCodeCountdown(account)
  })

  itCase('CX-SEC-010', '清空验证码为空拦截', { tags: ['account-security', 'medical-purge', 'p1'] }, async () => {
    await AccountSecurityFlow.assertClearMedicalEmptyCodeBlocked(account)
  })

  itCase('CX-SEC-011', '清空健康档案错误验证码', { tags: ['account-security', 'medical-purge', 'p1'] }, async () => {
    await AccountSecurityFlow.assertClearMedicalWrongCode(account)
  })

  itCase('CX-SEC-015', '注销账号风险阅读倒计时展示', { tags: ['account-security', 'p2'] }, async () => {
    await AccountSecurityFlow.assertDeletionCountdown(account)
  })

  itCase('CX-SEC-016', '注销账号确认短语校验', { tags: ['account-security', 'p2'] }, async () => {
    await AccountSecurityFlow.assertDeletionPhraseValidation(account)
  })

  itCase('CX-SEC-017', '注销短信重发倒计时', { tags: ['account-security', 'p2'] }, async () => {
    await AccountSecurityFlow.assertDeletionSmsCountdown(account)
  })
})
