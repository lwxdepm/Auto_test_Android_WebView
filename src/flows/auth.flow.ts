import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { WebViewContext } from '../core/webview-context.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { AppController } from '../core/app-controller.js'
import { LoginPage } from '../pages/LoginPage.js'
import { ChatPage } from '../pages/ChatPage.js'

export class AuthFlow {
  static async ensureOnLoginPage(): Promise<void> {
    await WebViewContext.switchToWebView()
    await LoginPage.ensureFreshLoginPage()
  }

  static async sendCode(phone: string): Promise<void> {
    await LoginPage.inputPhone(phone)
    await LoginPage.clickSendCode()
    await LoginPage.codeInput.waitForDisplayed({ timeout: 15000 })
  }

  static async loginWithFixedCode(account: TestAccount = accounts.normal, options: { allowProfile?: boolean } = {}): Promise<string> {
    const allowProfile = options.allowProfile ?? true
    await this.ensureOnLoginPage()
    await this.sendCode(account.phone)
    await LoginPage.inputCode(account.fixedCode)
    await LoginPage.checkAgreement()
    await LoginPage.submitLogin()
    const path = await LoginPage.expectLoginSuccess(allowProfile)
    await LoginPage.expectTokenWritten()
    return path
  }

  static async loginExpectChat(account: TestAccount = accounts.normal): Promise<void> {
    const path = await this.loginWithFixedCode(account, { allowProfile: false })
    assert.ok(path.startsWith('/chat'), `期望登录后进入 /chat，实际=${path}。请确认 ${account.name}/${account.phone} 是已完成资料的 active 测试账号。`)
    await ChatPage.waitForLoaded()
  }

  static async ensureLoggedIn(account: TestAccount = accounts.normal): Promise<void> {
    await WebViewContext.switchToWebView()
    const token = await H5Runtime.getLocalStorage('cx-token').catch(() => null)
    const tokenPhone = token ? await H5Runtime.getCurrentTokenPhone().catch(() => null) : null
    if (token && tokenPhone === account.phone) {
      await H5Runtime.goto('/chat')
      try {
        await ChatPage.waitForLoaded()
        return
      } catch {
        // token 可能过期或账号需补资料，走重新登录
      }
    } else if (token && tokenPhone !== account.phone) {
      // 同一轮 all 测试会切换多个测试账号；不能复用上一个账号的 token，
      // 否则“空材料/未授权”等专项账号会被误测成主账号。
      await H5Runtime.clearLoginStorage().catch(() => undefined)
    }
    await this.loginExpectChat(account)
  }

  static async assertWrongCode(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureOnLoginPage()
    await this.sendCode(account.phone)
    await LoginPage.inputCode('000000')
    await LoginPage.checkAgreement()
    await LoginPage.submitLogin()
    await LoginPage.expectErrorContains('验证码错误或已过期')
    await LoginPage.expectOnLogin()
  }

  static async assertInvalidPhone(): Promise<void> {
    await this.ensureOnLoginPage()
    await LoginPage.inputPhone('12345678901')
    await LoginPage.clickSendCode()
    await LoginPage.expectErrorContains('请输入正确的手机号')
    await LoginPage.expectOnLogin()
  }

  static async assertAgreementRequired(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureOnLoginPage()
    await this.sendCode(account.phone)
    await LoginPage.inputCode(account.fixedCode)
    await LoginPage.submitLogin()
    await LoginPage.expectErrorContains('请先阅读并同意')
    await LoginPage.expectOnLogin()
  }

  static async assertCodeInputFilter(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureOnLoginPage()
    await this.sendCode(account.phone)
    await LoginPage.inputCode('ab中文!@#1234567890')
    await browser.pause(300)
    const value = await LoginPage.getCodeValue()
    assert.equal(value, '123456', `验证码输入应只保留最多 6 位数字，实际=${value}`)
  }

  static async assertAppDataClearReturnsLogin(account: TestAccount = accounts.normal): Promise<void> {
    await this.loginExpectChat(account)
    await AppController.clearAppData()
    // pm clear 后 WebView/Chromedriver 目标会短暂销毁重建，立即切 context 容易触发 headers timeout。
    await browser.pause(2000)
    await AppController.launch()
    await browser.pause(3000)
    await WebViewContext.switchToWebView(60000)
    await LoginPage.waitForLoaded()
    await H5Runtime.expectLocalStorageMissing('cx-token')
  }

  static async assertVerifyCodeOneTimeUse(account: TestAccount = accounts.normal): Promise<void> {
    await this.ensureOnLoginPage()
    await this.sendCode(account.phone)
    await LoginPage.inputCode(account.fixedCode)
    await LoginPage.checkAgreement()
    await LoginPage.submitLogin()
    await LoginPage.expectLoginSuccess(true)
    await LoginPage.expectTokenWritten()

    await H5Runtime.clearLoginStorage()
    await H5Runtime.goto('/login')
    await LoginPage.waitForLoaded()
    await browser.pause(1200)

    const result = await H5Runtime.execute(async (phone, code) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, agreementAccepted: true }),
      })
      const json = await response.json().catch(() => ({})) as { success?: boolean; error?: string }
      return { ok: response.ok, status: response.status, success: json.success, error: json.error || '' }
    }, account.phone, account.fixedCode)

    assert.equal(result.ok, false, `复用已消费验证码不应登录成功：${JSON.stringify(result)}`)
    assert.ok(
      result.error.includes('验证码错误或已过期') || result.status === 400,
      `复用已消费验证码应提示错误或已过期，实际=${JSON.stringify(result)}`,
    )
    await LoginPage.expectOnLogin()
    await H5Runtime.expectLocalStorageMissing('cx-token')
  }
}
