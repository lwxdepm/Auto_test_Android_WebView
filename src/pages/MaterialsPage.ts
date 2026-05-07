import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'
import { selectors } from '../core/selectors.js'

export class MaterialsPage {
  static get backButton() {
    return selectors.containsText('返回', 'button')
  }

  static tab(name: '我的沟通卡' | '我的跟练卡') {
    return selectors.exactText(name, 'button')
  }

  static get firstCommunicationCard() {
    return selectors.containsText('点击查看详情', 'span')
  }

  static get firstPracticeCard() {
    return selectors.containsText('进度', 'span')
  }

  static async waitForLoaded(): Promise<void> {
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      const body = await H5Runtime.getBodyText().catch(() => '')
      return path === '/materials' && body.includes('我的材料') && body.includes('我的沟通卡')
    }, { timeout: 20000, interval: 500, timeoutMsg: '我的材料页未加载' })
  }

  static async selectTab(name: '我的沟通卡' | '我的跟练卡'): Promise<void> {
    const tab = this.tab(name)
    await tab.waitForClickable({ timeout: 10000 })
    await tab.click()
    await browser.waitUntil(async () => (await tab.getAttribute('aria-pressed')) === 'true', {
      timeout: 5000,
      timeoutMsg: `材料 Tab ${name} 未选中`,
    })
  }

  static async expectTabSelected(name: '我的沟通卡' | '我的跟练卡'): Promise<void> {
    const pressed = await this.tab(name).getAttribute('aria-pressed')
    assert.equal(pressed, 'true', `期望材料 Tab ${name} 选中，实际 ${pressed}`)
  }

  static async expectHasListOrEmptyState(): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('暂无已保存的沟通卡')
        || body.includes('暂无已保存的跟练卡')
        || body.includes('点击查看详情')
        || body.includes('进度')
    }, { timeout: 15000, interval: 300, timeoutMsg: '材料页未展示列表或空态' })
    const body = await H5Runtime.getBodyText()
    assert.ok(
      body.includes('暂无已保存的沟通卡') || body.includes('暂无已保存的跟练卡') || body.includes('点击查看详情') || body.includes('进度'),
      `材料页未展示列表或空态，body=${body.slice(0, 300)}`,
    )
  }

  static async backToChat(): Promise<void> {
    await this.backButton.waitForClickable({ timeout: 10000 })
    await this.backButton.click()
  }

  static async hasCommunicationCards(): Promise<boolean> {
    await this.expectHasListOrEmptyState().catch(() => undefined)
    const body = await H5Runtime.getBodyText()
    return body.includes('沟通卡片') && body.includes('点击查看详情')
  }

  static async hasPracticeCards(): Promise<boolean> {
    await this.expectHasListOrEmptyState().catch(() => undefined)
    const body = await H5Runtime.getBodyText()
    return body.includes('跟练卡') && body.includes('进度')
  }

  static async openFirstCommunicationCard(): Promise<void> {
    await this.firstCommunicationCard.waitForClickable({ timeout: 10000 })
    await this.firstCommunicationCard.click()
    await selectors.containsText('编辑卡片', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async openFirstPracticeCard(): Promise<void> {
    await this.firstPracticeCard.waitForClickable({ timeout: 10000 })
    await this.firstPracticeCard.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('保存于') || body.includes('该跟练方案暂时不可用')
    }, { timeout: 10000, interval: 300, timeoutMsg: '跟练卡详情未打开' })
  }

  static async startEditCommunicationCard(): Promise<void> {
    const edit = selectors.containsText('编辑卡片', 'button')
    await edit.waitForClickable({ timeout: 10000 })
    await edit.click()
    await selectors.containsText('保存修改', 'button').waitForDisplayed({ timeout: 10000 })
    await selectors.containsText('取消', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async cancelEditCommunicationCard(): Promise<void> {
    const cancel = selectors.exactText('取消', 'button')
    await cancel.waitForClickable({ timeout: 10000 })
    await cancel.click()
    await selectors.containsText('编辑卡片', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async saveCommunicationCardModification(marker: string): Promise<void> {
    await this.startEditCommunicationCard()
    await H5Runtime.execute((value) => {
      const titleInput = document.querySelector('input[placeholder="请输入卡片标题"]') as HTMLInputElement | null
      const textarea = Array.from(document.querySelectorAll('textarea'))[0] as HTMLTextAreaElement | undefined
      const target = textarea ?? titleInput
      if (!target) throw new Error('未找到沟通卡可编辑输入框')
      target.focus()
      const setter = Object.getOwnPropertyDescriptor(target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')?.set
      setter?.call(target, value)
      target.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
      target.dispatchEvent(new Event('change', { bubbles: true }))
    }, marker)
    const save = selectors.containsText('保存修改', 'button')
    await save.waitForClickable({ timeout: 10000 })
    await save.click()
    await selectors.containsText('编辑卡片', 'button').waitForDisplayed({ timeout: 15000 })
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(marker)
    }, { timeout: 10000, interval: 300, timeoutMsg: `沟通卡保存后未展示修改内容：${marker}` })
  }

  static async backToList(): Promise<void> {
    await selectors.containsText('返回列表', 'button').waitForClickable({ timeout: 10000 })
    await selectors.containsText('返回列表', 'button').click()
    await this.waitForLoaded()
  }
}
