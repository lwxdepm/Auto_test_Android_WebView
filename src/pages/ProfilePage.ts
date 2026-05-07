import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'
import { selectors } from '../core/selectors.js'

export class ProfilePage {
  static get nicknameInput() {
    return $('input[placeholder="请输入您的昵称"]')
  }

  static get birthdayButton() {
    return $('//label[contains(normalize-space(.), "出生日期")]/following-sibling::button[1]')
  }

  static get concernButton() {
    return $('//label[contains(normalize-space(.), "当前关注情况")]/following-sibling::div//button[1]')
  }

  static get femaleButton() {
    return selectors.containsText('女性', 'button')
  }

  static get maleButton() {
    return selectors.containsText('男性', 'button')
  }

  static get saveButton() {
    return selectors.containsText('保存', 'button')
  }

  static get skipButton() {
    return selectors.containsText('跳过，直接进入对话', 'button')
  }

  static get backButton() {
    return selectors.containsText('返回', 'button')
  }

  static get accountSecurityButton() {
    return selectors.containsText('账号与安全', 'button')
  }

  static async waitForLoaded(): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('个人信息') && body.includes('当前关注情况') && body.includes('性别')
    }, { timeout: 20000, interval: 500, timeoutMsg: '个人信息页未加载' })
  }

  static async expectElements(): Promise<void> {
    await this.waitForLoaded()
    await this.nicknameInput.waitForDisplayed({ timeout: 10000 })
    const body = await H5Runtime.getBodyText()
    for (const text of ['出生日期', '当前关注情况', '性别']) {
      assert.ok(body.includes(text), `个人信息页缺少：${text}`)
    }
  }

  static async inputNickname(value: string): Promise<void> {
    await this.nicknameInput.waitForDisplayed({ timeout: 10000 })
    await this.nicknameInput.setValue(value)
    assert.equal(await this.nicknameInput.getValue(), value)
  }

  static async clearNickname(): Promise<void> {
    await this.nicknameInput.waitForDisplayed({ timeout: 10000 })
    await H5Runtime.execute(() => {
      const input = document.querySelector('input[placeholder="请输入您的昵称"]') as HTMLInputElement | null
      if (!input) throw new Error('未找到昵称输入框')
      input.focus()
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, '')
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await browser.waitUntil(async () => {
      const value = await H5Runtime.execute(() => (document.querySelector('input[placeholder="请输入您的昵称"]') as HTMLInputElement | null)?.value ?? '')
      return value === ''
    }, { timeout: 5000, interval: 200, timeoutMsg: `昵称输入框未被清空，实际=${await this.nicknameInput.getValue().catch(() => '')}` })
  }

  static async openBirthdayPickerAndConfirm(): Promise<void> {
    const trigger = this.birthdayButton
    await trigger.waitForClickable({ timeout: 10000 })
    await trigger.click()
    await selectors.exactText('选择出生日期').waitForDisplayed({ timeout: 10000 })
    await selectors.exactText('确定', 'button').click()
    await browser.waitUntil(async () => !(await selectors.exactText('选择出生日期').isDisplayed().catch(() => false)), {
      timeout: 10000,
      timeoutMsg: '出生日期选择器未关闭',
    })
  }

  static async selectFirstConcern(): Promise<void> {
    await this.concernButton.waitForClickable({ timeout: 10000 })
    await this.concernButton.click()
    const first = $('//*[@role="listbox" and @aria-label="关注情况"]//*[@role="option"][1]')
    await first.waitForDisplayed({ timeout: 10000 })
    const label = await first.getText()
    await first.click()
    await browser.waitUntil(async () => (await H5Runtime.getBodyText()).includes(label.trim()), {
      timeout: 5000,
      timeoutMsg: `关注情况未回填：${label}`,
    })
  }

  static async selectConcernByText(text: string): Promise<void> {
    await this.concernButton.waitForClickable({ timeout: 10000 })
    await this.concernButton.click()
    await H5Runtime.execute((targetText) => {
      const options = Array.from(document.querySelectorAll('[role="option"], button')) as HTMLElement[]
      const option = options.find((el) => (el.textContent || '').includes(targetText))
      if (!option) throw new Error(`未找到关注情况选项：${targetText}`)
      option.scrollIntoView({ block: 'center', inline: 'nearest' })
      option.click()
    }, text)
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(text)
    }, { timeout: 5000, interval: 200, timeoutMsg: `关注情况未回填：${text}` })
  }

  static async selectGender(gender: '女性' | '男性'): Promise<void> {
    const btn = gender === '女性' ? this.femaleButton : this.maleButton
    await btn.waitForClickable({ timeout: 10000 })
    await btn.click()
    await btn.waitForDisplayed({ timeout: 5000 })
  }

  static async expectSkipVisible(visible: boolean): Promise<void> {
    await this.waitForLoaded()
    const displayed = await this.skipButton.isDisplayed().catch(() => false)
    assert.equal(displayed, visible, `跳过按钮可见性不符合预期，expected=${visible}, actual=${displayed}`)
  }

  static async openAccountSecurity(): Promise<void> {
    await this.accountSecurityButton.waitForDisplayed({ timeout: 10000 })
    await this.accountSecurityButton.scrollIntoView()
    await this.accountSecurityButton.waitForClickable({ timeout: 10000 })
    await this.accountSecurityButton.click()
  }

  static async backToChat(): Promise<void> {
    await this.backButton.waitForClickable({ timeout: 10000 })
    await this.backButton.click()
  }

  static async expectErrorContains(text: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(text)
    }, { timeout: 8000, interval: 300, timeoutMsg: `个人信息页未出现错误提示：${text}` })
  }

  static async save(): Promise<void> {
    await this.saveButton.waitForClickable({ timeout: 10000 })
    await this.saveButton.click()
  }

  static async fillRequiredProfile(nickname: string): Promise<void> {
    await this.inputNickname(nickname)
    await this.openBirthdayPickerAndConfirm()
    await this.selectGender('女性')
    await this.selectFirstConcern()
  }

  static async skip(): Promise<void> {
    await this.skipButton.waitForClickable({ timeout: 10000 })
    await this.skipButton.click()
  }
}
