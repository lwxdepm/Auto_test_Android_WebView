import assert from 'node:assert/strict'
import { $, $$, browser } from '@wdio/globals'
import { selectors } from '../core/selectors.js'
import { sleep } from '../core/wait.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { AgreementModal } from './AgreementModal.js'

export class LoginPage {
  static get phoneInput() {
    return $('input[placeholder="请输入手机号"]')
  }

  static get codeInput() {
    return $('input[placeholder="请输入验证码"]')
  }

  static get agreementCheckbox() {
    return $('#agreement-checkbox')
  }

  static get getCodeButton() {
    return selectors.exactText('获取验证码', 'button')
  }

  static get loginButton() {
    return selectors.exactText('登录', 'button')
  }

  static get userAgreementLink() {
    return selectors.exactText('《用户协议》', 'a')
  }

  static get privacyPolicyLink() {
    return selectors.exactText('《隐私政策》', 'a')
  }

  static async waitForLoaded(): Promise<void> {
    await this.phoneInput.waitForDisplayed({ timeout: 15000 })
  }

  static async ensureFreshLoginPage(): Promise<void> {
    await H5Runtime.clearLoginStorage().catch(() => undefined)
    await H5Runtime.goto('/login')
    await this.waitForLoaded()
  }

  static async inputPhone(phone: string): Promise<void> {
    await this.phoneInput.waitForDisplayed({ timeout: 10000 })
    await this.phoneInput.setValue(phone)
  }

  static async clickSendCode(): Promise<void> {
    // 后端短信接口通常 1 秒限流；测试间隔主动拉开，降低相互污染。
    await sleep(1200)
    const btn = this.getCodeButton
    await btn.waitForClickable({ timeout: 10000 })
    await btn.click()
  }

  static async inputCode(code: string): Promise<void> {
    await this.codeInput.waitForDisplayed({ timeout: 15000 })
    await this.codeInput.setValue(code)
  }

  static async getCodeValue(): Promise<string> {
    await this.codeInput.waitForDisplayed({ timeout: 10000 })
    return String(await this.codeInput.getValue())
  }

  static async checkAgreement(): Promise<void> {
    await this.agreementCheckbox.waitForExist({ timeout: 10000 })
    if (!(await this.agreementCheckbox.isSelected())) {
      await this.agreementCheckbox.click()
    }
  }

  static async submitLogin(): Promise<void> {
    const btn = this.loginButton
    await btn.waitForClickable({ timeout: 10000 })
    await btn.click()
  }

  static async expectErrorContains(text: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText()
      return body.includes(text)
    }, {
      timeout: 10000,
      interval: 300,
      timeoutMsg: `未找到错误提示：${text}`,
    })
  }

  static async expectOnLogin(): Promise<void> {
    await this.waitForLoaded()
    const path = await H5Runtime.getPathname()
    assert.equal(path, '/login', `期望停留在 /login，实际=${await H5Runtime.getCurrentUrl()}`)
  }

  static async expectLoginSuccess(allowProfile = true): Promise<string> {
    const allowed = allowProfile ? ['/chat', '/profile', '/deletion-pending'] : ['/chat']
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      return allowed.some((p) => path === p || path.startsWith(`${p}/`))
    }, {
      timeout: 20000,
      interval: 500,
      timeoutMsg: `登录后未进入预期页面：${allowed.join(', ')}`,
    })
    return H5Runtime.getPathname()
  }

  static async expectTokenWritten(): Promise<void> {
    const token = await H5Runtime.getLocalStorage('cx-token')
    assert.ok(token && token.length > 10, '期望登录后 localStorage.cx-token 已写入')
  }

  static async openUserAgreement(): Promise<void> {
    await this.userAgreementLink.waitForClickable({ timeout: 10000 })
    await this.userAgreementLink.click()
    await AgreementModal.expectTitle('用户协议')
  }

  static async openPrivacyPolicyFlexible(): Promise<void> {
    await this.privacyPolicyLink.waitForClickable({ timeout: 10000 })
    await this.privacyPolicyLink.click()

    // 当前前端实现可能先打开“用户协议”，再通过主按钮进入“隐私政策”。
    await browser.waitUntil(async () => {
      const privacyTitle = await AgreementModal.title('隐私政策').isDisplayed().catch(() => false)
      const userTitle = await AgreementModal.title('用户协议').isDisplayed().catch(() => false)
      return privacyTitle || userTitle
    }, { timeout: 10000, timeoutMsg: '点击隐私政策后未打开任何协议弹窗' })

    const privacyTitle = await AgreementModal.title('隐私政策').isDisplayed().catch(() => false)
    if (!privacyTitle) {
      await AgreementModal.clickPrimary('隐私政策')
    }
    await AgreementModal.expectTitle('隐私政策')
  }

  static async expectResendCoolingDown(): Promise<void> {
    await browser.waitUntil(async () => {
      const buttons = await $$('//button')
      for (const button of buttons) {
        const text = (await button.getText().catch(() => '')).trim()
        if (/^\d+s$/.test(text) || text.includes('后重试')) return true
        if ((text.includes('重新发送') || text.includes('获取验证码')) && !(await button.isEnabled())) return true
      }
      return false
    }, {
      timeout: 10000,
      interval: 300,
      timeoutMsg: '未观察到验证码倒计时或按钮禁用状态',
    })
  }
}
