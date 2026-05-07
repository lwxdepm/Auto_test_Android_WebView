import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { AuthFlow } from '../flows/auth.flow.js'
import { LoginPage } from '../pages/LoginPage.js'
import { AgreementModal } from '../pages/AgreementModal.js'

const account = accounts.normal

describe('基础登录', () => {
  itCase('CX-WV-BASE-004', '无效手机号前端提示', { tags: ['smoke', 'login', 'p0'] }, async () => {
    await AuthFlow.assertInvalidPhone()
  })

  itCase('CX-WV-BASE-007', '用户协议弹窗正常打开并关闭', { tags: ['login', 'p1'] }, async () => {
    await AuthFlow.ensureOnLoginPage()
    await LoginPage.openUserAgreement()
    await AgreementModal.close()
    await LoginPage.waitForLoaded()
  })

  itCase('CX-WV-BASE-008', '隐私政策弹窗可进入并关闭', { tags: ['login', 'p1'] }, async () => {
    await AuthFlow.ensureOnLoginPage()
    await LoginPage.openPrivacyPolicyFlexible()
    await AgreementModal.close()
    await LoginPage.waitForLoaded()
  })

  itCase('CX-WV-BASE-005', '重复获取验证码时按钮倒计时或禁用', { tags: ['smoke', 'login', 'p0'] }, async () => {
    await AuthFlow.ensureOnLoginPage()
    await AuthFlow.sendCode(account.phone)
    await LoginPage.expectResendCoolingDown()
  })

  itCase('CX-WV-BASE-019', '验证码输入过滤，仅保留最多 6 位数字', { tags: ['login', 'p1'] }, async () => {
    await AuthFlow.assertCodeInputFilter(account)
  })

  itCase('CX-WV-BASE-006', '协议未勾选时禁止登录', { tags: ['smoke', 'login', 'p0'] }, async () => {
    await AuthFlow.assertAgreementRequired(account)
  })

  itCase('CX-WV-BASE-003', '错误验证码提示错误且不进入登录态', { tags: ['smoke', 'login', 'p0'] }, async () => {
    await AuthFlow.assertWrongCode(account)
  })

  itCase('CX-WV-BASE-014', '验证码一次性使用', { tags: ['login', 'p1'] }, async () => {
    await AuthFlow.assertVerifyCodeOneTimeUse(account)
  })

  itCase('CX-WV-BASE-002', '正确验证码登录成功', { tags: ['smoke', 'login', 'p0'] }, async () => {
    const path = await AuthFlow.loginWithFixedCode(account, { allowProfile: true })
    if (!['/chat', '/profile'].some((p) => path === p || path.startsWith(`${p}/`))) {
      throw new Error(`登录后路径不符合预期：${path}`)
    }
    await LoginPage.expectTokenWritten()
    await H5Runtime.expectNotBlank()
  })
})
