import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'
import { selectors } from '../core/selectors.js'

export type CommunicationCardEditFieldLabel = '就诊目标' | '我的情况' | '特别说明' | '我的问题'

export interface CommunicationCardEditPayload {
  title?: string
  cardDate?: string
  visitPurpose?: string
  currentSituation?: string
  informationForDoctor?: string
  questionsForDoctor?: string
}

export interface PracticeProgressSnapshot {
  completed: number
  total: number
  raw: string
}

export interface PracticeStepSnapshot {
  current: number
  total: number
}

const communicationFieldLabels: Record<keyof Pick<
  CommunicationCardEditPayload,
  'visitPurpose' | 'currentSituation' | 'informationForDoctor' | 'questionsForDoctor'
>, CommunicationCardEditFieldLabel> = {
  visitPurpose: '就诊目标',
  currentSituation: '我的情况',
  informationForDoctor: '特别说明',
  questionsForDoctor: '我的问题',
}

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

  static async openCommunicationCardByTitle(title: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(title)
    }, { timeout: 15000, interval: 300, timeoutMsg: `沟通卡列表未展示目标标题：${title}` })
    await H5Runtime.execute((targetTitle) => {
      const candidates = (Array.from(document.querySelectorAll('p, span, div')) as HTMLElement[])
        .filter((node) => (node.textContent || '').includes(targetTitle))
        // 父级容器的 textContent 也会包含标题；优先点击文本最短的叶子节点，
        // 让 React 事件冒泡到列表项 onClick。
        .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
      const el = candidates[0]
      if (!el) throw new Error(`未找到沟通卡标题：${targetTitle}`)
      el.scrollIntoView({ block: 'center', inline: 'nearest' })
      el.click()
    }, title)
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

  static async expectCommunicationCardEditMode(): Promise<void> {
    await selectors.containsText('保存修改', 'button').waitForDisplayed({ timeout: 10000 })
    await selectors.containsText('取消', 'button').waitForDisplayed({ timeout: 10000 })
    await browser.waitUntil(async () => {
      const hasInputs = await H5Runtime.execute(() => {
        return Boolean(
          document.querySelector('input[placeholder="请输入卡片标题"]')
            && document.querySelector('input[placeholder="YYYY-MM-DD"]')
            && document.querySelectorAll('textarea').length >= 4,
        )
      }).catch(() => false)
      return hasInputs
    }, { timeout: 10000, interval: 300, timeoutMsg: '沟通卡编辑态未展示标题/日期/四个详情输入框' })
  }

  static async cancelEditCommunicationCard(): Promise<void> {
    const cancel = selectors.exactText('取消', 'button')
    await cancel.waitForClickable({ timeout: 10000 })
    await cancel.click()
    await selectors.containsText('编辑卡片', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async setCommunicationCardInputByPlaceholder(placeholder: '请输入卡片标题' | 'YYYY-MM-DD', value: string): Promise<void> {
    await H5Runtime.execute((targetPlaceholder, nextValue) => {
      function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
        const prototype = element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype
        const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
        setter?.call(element, text)
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }

      const input = document.querySelector(`input[placeholder="${targetPlaceholder}"]`) as HTMLInputElement | null
      if (!input) throw new Error(`未找到沟通卡输入框：${targetPlaceholder}`)
      input.scrollIntoView({ block: 'center', inline: 'nearest' })
      input.focus()
      setNativeValue(input, nextValue)
    }, placeholder, value)
  }

  static async setCommunicationCardEditField(label: CommunicationCardEditFieldLabel, value: string): Promise<void> {
    await H5Runtime.execute((targetLabel, nextValue) => {
      function normalize(text: string | null | undefined) {
        return (text || '').replace(/\s+/g, ' ').trim()
      }

      function setNativeValue(element: HTMLTextAreaElement, text: string) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        setter?.call(element, text)
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }

      const labelEl = (Array.from(document.querySelectorAll('span, div')) as HTMLElement[])
        .find((el) => normalize(el.textContent) === targetLabel)
      if (!labelEl) throw new Error(`未找到沟通卡字段标签：${targetLabel}`)

      let root: HTMLElement | null = labelEl
      let textarea: HTMLTextAreaElement | null = null
      for (let i = 0; i < 6 && root; i++) {
        textarea = root.querySelector('textarea')
        if (textarea) break
        root = root.parentElement
      }
      if (!textarea) throw new Error(`未找到沟通卡字段输入框：${targetLabel}`)

      textarea.scrollIntoView({ block: 'center', inline: 'nearest' })
      textarea.focus()
      setNativeValue(textarea, nextValue)
    }, label, value)
  }

  static async fillCommunicationCardEditForm(update: CommunicationCardEditPayload): Promise<void> {
    if (update.title !== undefined) {
      await this.setCommunicationCardInputByPlaceholder('请输入卡片标题', update.title)
    }
    if (update.cardDate !== undefined) {
      await this.setCommunicationCardInputByPlaceholder('YYYY-MM-DD', update.cardDate)
    }

    for (const [field, label] of Object.entries(communicationFieldLabels) as Array<[keyof typeof communicationFieldLabels, CommunicationCardEditFieldLabel]>) {
      const value = update[field]
      if (value !== undefined) await this.setCommunicationCardEditField(label, value)
    }
  }

  static async saveCommunicationCardEdit(update: CommunicationCardEditPayload): Promise<void> {
    await this.startEditCommunicationCard()
    await this.expectCommunicationCardEditMode()
    await this.fillCommunicationCardEditForm(update)
    const save = selectors.containsText('保存修改', 'button')
    await save.waitForClickable({ timeout: 10000 })
    await save.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return !body.includes('保存中...')
    }, { timeout: 15000, interval: 300, timeoutMsg: '沟通卡保存修改一直处于保存中' })
    await selectors.containsText('编辑卡片', 'button').waitForDisplayed({ timeout: 15000 })
  }

  static async expectCommunicationCardEditSaveError(
    update: CommunicationCardEditPayload,
    expectedErrorText: string,
  ): Promise<void> {
    await this.startEditCommunicationCard()
    await this.expectCommunicationCardEditMode()
    await this.fillCommunicationCardEditForm(update)
    const save = selectors.containsText('保存修改', 'button')
    await save.waitForClickable({ timeout: 10000 })
    await save.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(expectedErrorText)
    }, {
      timeout: 10000,
      interval: 300,
      timeoutMsg: `沟通卡非法保存未展示错误：${expectedErrorText}`,
    })
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

  static async expectCommunicationCardContains(markers: string[], timeout = 10000): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return markers.every((marker) => body.includes(marker))
    }, {
      timeout,
      interval: 300,
      timeoutMsg: `沟通卡详情未展示修改后的内容：${markers.join(' / ')}`,
    })
  }

  static async getVisibleTextFontSize(text: string): Promise<number> {
    return H5Runtime.execute((targetText) => {
      const isVisible = (el: Element) => {
        const html = el as HTMLElement
        const style = window.getComputedStyle(html)
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && style.opacity !== '0'
          && html.getClientRects().length > 0
      }
      const candidates = (Array.from(document.querySelectorAll('span, div, p, button')) as HTMLElement[])
        .filter((el) => isVisible(el) && (el.textContent || '').includes(targetText))
        .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
      const el = candidates[0]
      if (!el) throw new Error(`未找到可见文本：${targetText}`)
      return Number.parseFloat(window.getComputedStyle(el).fontSize)
    }, text)
  }

  static async expectPracticeOverview(timeout = 15000): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('总时长') && body.includes('当前进度') && body.includes('跟练时长')
    }, { timeout, interval: 300, timeoutMsg: '跟练卡总览未展示总时长/当前进度/跟练时长' })
  }

  static async expectPracticeFollowMode(timeout = 15000): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('步骤') && body.includes('重播本步') && body.includes('返回总览')
    }, { timeout, interval: 300, timeoutMsg: '跟练卡未进入步骤跟练态' })
  }

  static async getPracticeStartButtonLabel(): Promise<'开始跟练' | '继续跟练' | '再跟练一次' | null> {
    return H5Runtime.execute(() => {
      const labels = ['开始跟练', '继续跟练', '再跟练一次'] as const
      const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
      for (const label of labels) {
        const button = buttons.find((btn) => (btn.textContent || '').replace(/\s+/g, ' ').trim() === label)
        if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') return label
      }
      return null
    })
  }

  static async clickPracticeButtonIfEnabled(text: '开始跟练' | '继续跟练' | '再跟练一次' | '下一步' | '上一步' | '重播本步' | '返回总览'): Promise<boolean> {
    const clicked = await H5Runtime.execute((targetText) => {
      const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
      const button = buttons.find((btn) => (btn.textContent || '').replace(/\s+/g, ' ').trim() === targetText)
      if (!button) return false
      button.scrollIntoView({ block: 'center', inline: 'nearest' })
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') return false
      button.click()
      return true
    }, text)
    await browser.pause(300)
    return clicked
  }

  static async startPracticeFollow(): Promise<PracticeStepSnapshot> {
    await this.expectPracticeOverview()
    const label = await this.getPracticeStartButtonLabel()
    const body = await H5Runtime.getBodyText()
    assert.ok(label, `当前跟练卡没有可点击的跟练入口，body=${body.slice(0, 500)}`)
    assert.equal(await this.clickPracticeButtonIfEnabled(label), true, `点击${label}失败`)
    await this.expectPracticeFollowMode()
    return this.getPracticeStepSnapshot()
  }

  static async getPracticeStepSnapshot(): Promise<PracticeStepSnapshot> {
    const body = await H5Runtime.getBodyText()
    const match = body.match(/步骤\s*(\d+)\s*\/\s*(\d+)/)
    assert.ok(match, `未解析到跟练步骤信息，body=${body.slice(0, 500)}`)
    return {
      current: Number(match[1]),
      total: Number(match[2]),
    }
  }

  static async waitForPracticeStepAtLeast(minCurrent: number, timeout = 10000): Promise<PracticeStepSnapshot> {
    let snapshot: PracticeStepSnapshot | null = null
    await browser.waitUntil(async () => {
      snapshot = await this.getPracticeStepSnapshot().catch(() => null)
      return Boolean(snapshot && snapshot.current >= minCurrent)
    }, {
      timeout,
      interval: 300,
      timeoutMsg: `跟练步骤未前进到 ${minCurrent} 或之后`,
    })
    assert.ok(snapshot, '未获取到跟练步骤信息')
    return snapshot
  }

  static async clickPracticeNextIfAvailable(): Promise<boolean> {
    return this.clickPracticeButtonIfEnabled('下一步')
  }

  static async clickPracticePreviousIfAvailable(): Promise<boolean> {
    return this.clickPracticeButtonIfEnabled('上一步')
  }

  static async replayCurrentPracticeStep(): Promise<void> {
    assert.equal(await this.clickPracticeButtonIfEnabled('重播本步'), true, '重播本步按钮不可点击')
    await this.expectPracticeFollowMode()
  }

  static async returnPracticeOverview(): Promise<void> {
    assert.equal(await this.clickPracticeButtonIfEnabled('返回总览'), true, '返回总览按钮不可点击')
    await this.expectPracticeOverview()
  }

  static async getPracticeProgressSnapshot(): Promise<PracticeProgressSnapshot> {
    const body = await H5Runtime.getBodyText()
    const match = body.match(/当前进度\s*(\d+)\s*\/\s*(\d+)/)
      ?? body.match(/已完成\s*(\d+)\s*\/\s*(\d+)/)
    assert.ok(match, `未解析到跟练进度信息，body=${body.slice(0, 500)}`)
    return {
      completed: Number(match[1]),
      total: Number(match[2]),
      raw: match[0],
    }
  }

  static async waitForPracticeOverviewProgressAtLeast(minCompleted: number, timeout = 15000): Promise<PracticeProgressSnapshot> {
    await this.expectPracticeOverview(timeout)
    let snapshot: PracticeProgressSnapshot | null = null
    await browser.waitUntil(async () => {
      snapshot = await this.getPracticeProgressSnapshot().catch(() => null)
      return Boolean(snapshot && snapshot.completed >= minCompleted)
    }, {
      timeout,
      interval: 300,
      timeoutMsg: `跟练卡总览进度未达到 ${minCompleted}`,
    })
    assert.ok(snapshot, '未获取到跟练进度信息')
    return snapshot
  }

  static async backToList(): Promise<void> {
    await selectors.containsText('返回列表', 'button').waitForClickable({ timeout: 10000 })
    await selectors.containsText('返回列表', 'button').click()
    await this.waitForLoaded()
  }
}
