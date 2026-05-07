import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'
import { selectors } from '../core/selectors.js'

export class AccountSecurityPage {
  static get backButton() {
    return selectors.containsText('返回', 'button')
  }

  static get clearMedicalDataRow() {
    return selectors.exactText('清空健康档案', 'div')
  }

  static get deleteAccountRow() {
    return selectors.exactText('注销账号', 'div')
  }

  static async waitForLoaded(): Promise<void> {
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      const body = await H5Runtime.getBodyText().catch(() => '')
      return path === '/account-security' && body.includes('账号与安全') && body.includes('清空健康档案') && body.includes('注销账号')
    }, { timeout: 15000, interval: 300, timeoutMsg: '账号与安全页未加载' })
  }

  static async backToProfile(): Promise<void> {
    await this.backButton.waitForClickable({ timeout: 10000 })
    await this.backButton.click()
  }

  static async openClearDialog(): Promise<void> {
    await this.clearMedicalDataRow.waitForDisplayed({ timeout: 10000 })
    await this.clearMedicalDataRow.click()
    await selectors.exactText('清空健康档案').waitForDisplayed({ timeout: 10000 })
    await selectors.containsText('我已了解，继续', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async cancelClearDialog(): Promise<void> {
    await selectors.exactText('取消', 'button').waitForClickable({ timeout: 10000 })
    await selectors.exactText('取消', 'button').click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText()
      return !body.includes('执行后将立即永久删除')
    }, { timeout: 5000, timeoutMsg: '清空健康档案弹窗未关闭' })
  }

  static async openDeleteDialog(): Promise<void> {
    await this.deleteAccountRow.waitForDisplayed({ timeout: 10000 })
    await this.deleteAccountRow.click()
    await selectors.exactText('注销账号').waitForDisplayed({ timeout: 10000 })
    await selectors.containsText('15 天冷静期').waitForDisplayed({ timeout: 10000 })
  }

  static async cancelDeleteDialog(): Promise<void> {
    const cancel = selectors.exactText('取消', 'button')
    await cancel.waitForClickable({ timeout: 10000 })
    await cancel.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText()
      return !body.includes('提交后将进入') && !body.includes('15 天冷静期')
    }, { timeout: 5000, timeoutMsg: '注销账号弹窗未关闭' })
  }

  static async expectDeletionCountdown(): Promise<void> {
    await this.openDeleteDialog()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return /请阅读\s+\d+s/.test(body)
    }, { timeout: 5000, interval: 300, timeoutMsg: '注销风险阅读倒计时未展示' })
  }

  static async expectDeletionPhraseValidation(): Promise<void> {
    await this.openDeleteDialog()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('我已阅读，继续')
    }, { timeout: 12000, interval: 500, timeoutMsg: '注销风险阅读倒计时未结束' })

    await selectors.exactText('我已阅读，继续', 'button').click()
    await selectors.containsText('请输入「确认注销」').waitForDisplayed({ timeout: 5000 })
    const input = $('input[placeholder="确认注销"]')
    await input.waitForDisplayed({ timeout: 5000 })
    await input.setValue('错误短语')
    const next = selectors.exactText('下一步', 'button')
    assert.equal(await next.isEnabled(), false, '输入错误短语时下一步应不可点击')
    await input.setValue('确认注销')
    await browser.waitUntil(async () => next.isEnabled(), { timeout: 5000, interval: 300, timeoutMsg: '输入正确短语后下一步未变为可点击' })
  }

  static async continueToClearMedicalVerify(): Promise<void> {
    await this.openClearDialog()
    const next = selectors.containsText('我已了解，继续', 'button')
    await next.waitForClickable({ timeout: 10000 })
    await next.click()
    await selectors.exactText('短信验证').waitForDisplayed({ timeout: 10000 })
    await $('input[placeholder="请输入 6 位验证码"]').waitForDisplayed({ timeout: 10000 })
  }

  static async expectClearMedicalCountdown(): Promise<void> {
    await this.continueToClearMedicalVerify()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return /\d+s 后可重发/.test(body)
    }, { timeout: 10000, interval: 300, timeoutMsg: '清空健康档案验证码重发倒计时未展示' })
  }

  static async expectClearMedicalEmptyCodeBlocked(): Promise<void> {
    await this.continueToClearMedicalVerify()
    const confirm = selectors.exactText('确认清除', 'button')
    await confirm.waitForDisplayed({ timeout: 10000 })
    assert.equal(await confirm.isEnabled(), false, '验证码为空时“确认清除”应不可点击')
  }

  static async expectClearMedicalWrongCode(): Promise<void> {
    await this.continueToClearMedicalVerify()
    const input = $('input[placeholder="请输入 6 位验证码"]')
    await input.setValue('000000')
    const confirm = selectors.exactText('确认清除', 'button')
    await browser.waitUntil(async () => confirm.isEnabled(), { timeout: 5000, interval: 300, timeoutMsg: '输入错误验证码后确认按钮未可点击' })
    await confirm.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('验证码错误或已过期')
    }, { timeout: 10000, interval: 300, timeoutMsg: '清空健康档案错误验证码未提示错误' })
  }

  static async continueToDeletionVerify(): Promise<void> {
    await this.openDeleteDialog()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('我已阅读，继续')
    }, { timeout: 12000, interval: 500, timeoutMsg: '注销风险阅读倒计时未结束' })
    await selectors.exactText('我已阅读，继续', 'button').click()
    const input = $('input[placeholder="确认注销"]')
    await input.waitForDisplayed({ timeout: 5000 })
    await input.setValue('确认注销')
    const next = selectors.exactText('下一步', 'button')
    await browser.waitUntil(async () => next.isEnabled(), { timeout: 5000, interval: 300, timeoutMsg: '输入确认短语后下一步未可点击' })
    await next.click()
    await selectors.exactText('短信验证').waitForDisplayed({ timeout: 10000 })
    await $('input[placeholder="请输入 6 位验证码"]').waitForDisplayed({ timeout: 10000 })
  }

  static async expectDeletionSmsCountdown(): Promise<void> {
    await this.continueToDeletionVerify()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return /\d+s 后可重发/.test(body)
    }, { timeout: 10000, interval: 300, timeoutMsg: '注销短信验证码重发倒计时未展示' })
  }
}
