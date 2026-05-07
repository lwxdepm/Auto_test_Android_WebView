import { $, browser } from '@wdio/globals'
import { selectors } from '../core/selectors.js'
import { H5Runtime } from '../core/h5-runtime.js'

export class SideDrawerPage {
  static get title() {
    return selectors.exactText('橙欣健康')
  }

  static get closeBackdrop() {
    return $('button[aria-label="关闭对话记录"]')
  }

  static get logoutButton() {
    return selectors.containsText('退出登录', 'button')
  }

  static async waitForOpened(): Promise<void> {
    await selectors.containsText('个人信息', 'button').waitForDisplayed({ timeout: 15000 })
    await this.logoutButton.waitForDisplayed({ timeout: 15000 })
  }

  static async close(): Promise<void> {
    const backdrop = this.closeBackdrop
    await backdrop.waitForClickable({ timeout: 10000 })
    await backdrop.click()
    await selectors.containsText('个人信息', 'button').waitForDisplayed({ timeout: 10000, reverse: true })
  }

  static item(label: '个人信息' | '阅读设置' | '健康档案' | '我的材料' | '素材上传台') {
    return selectors.containsText(label, 'button')
  }

  static async openItem(label: '个人信息' | '阅读设置' | '健康档案' | '我的材料' | '素材上传台'): Promise<void> {
    await this.waitForOpened()
    const item = this.item(label)
    await item.waitForClickable({ timeout: 10000 })
    await item.click()
  }

  static async hasDeleteSessionButton(): Promise<boolean> {
    return $('button[title="删除对话"]').isDisplayed().catch(() => false)
  }

  static async openFirstDeleteSessionConfirm(): Promise<void> {
    const btn = $('button[title="删除对话"]')
    await btn.waitForClickable({ timeout: 5000 })
    await btn.click()
    await selectors.containsText('确定要删除这个对话吗？').waitForDisplayed({ timeout: 5000 })
  }

  static async cancelDeleteSessionConfirm(): Promise<void> {
    const cancel = selectors.exactText('取消', 'button')
    await cancel.waitForClickable({ timeout: 5000 })
    await cancel.click()
    await selectors.containsText('确定要删除这个对话吗？').waitForDisplayed({ timeout: 5000, reverse: true })
  }

  static async openLatestSession(): Promise<void> {
    await this.waitForOpened()
    await browser.waitUntil(async () => {
      return H5Runtime.execute(() => {
        const metas = Array.from(document.querySelectorAll('div'))
          .filter((el) => (el.textContent || '').includes('条消息 ·'))
        return metas.length > 0
      }).catch(() => false)
    }, { timeout: 15000, interval: 300, timeoutMsg: '侧边栏未加载出任何历史会话' })

    await H5Runtime.execute(() => {
      const metas = Array.from(document.querySelectorAll('div'))
        .filter((el) => (el.textContent || '').includes('条消息 ·'))
      const content = metas[0]?.parentElement as HTMLElement | null
      if (!content) throw new Error('未找到最新历史会话可点击区域')
      content.click()
    })
  }

  static async waitForSessionTitle(title: string): Promise<void> {
    await this.waitForOpened()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(title)
    }, { timeout: 15000, interval: 300, timeoutMsg: `侧边栏未出现会话：${title}` })
  }

  static async deleteSessionByTitle(title: string): Promise<void> {
    await this.waitForSessionTitle(title)
    await H5Runtime.execute((targetTitle) => {
      const titleEl = Array.from(document.querySelectorAll('div'))
        .find((el) => (el.textContent || '').trim() === targetTitle)
      const sessionItem = titleEl?.parentElement?.parentElement
      const deleteButton = sessionItem?.querySelector('button[title="删除对话"]') as HTMLButtonElement | null
      if (!deleteButton) throw new Error(`未找到会话删除按钮：${targetTitle}`)
      deleteButton.click()
    }, title)
    await selectors.containsText('确定要删除这个对话吗？').waitForDisplayed({ timeout: 5000 })
    const confirmDelete = selectors.exactText('删除', 'button')
    await confirmDelete.waitForClickable({ timeout: 5000 })
    await confirmDelete.click()
    await selectors.containsText('确定要删除这个对话吗？').waitForDisplayed({ timeout: 5000, reverse: true })
  }

  static async expectSessionTitleMissing(title: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return !body.includes(title)
    }, { timeout: 10000, interval: 300, timeoutMsg: `删除后会话仍出现在列表：${title}` })
  }

  static async scrollHistoryToBottom(): Promise<void> {
    await this.waitForOpened()
    await H5Runtime.execute(() => {
      const label = Array.from(document.querySelectorAll('div'))
        .find((el) => (el.textContent || '').trim() === '对话记录')
      const candidates = Array.from(document.querySelectorAll('div')) as HTMLDivElement[]
      const list = candidates.find((el) => {
        const style = getComputedStyle(el)
        return /(auto|scroll)/.test(style.overflowY)
          && el.scrollHeight > el.clientHeight
          && (!!label ? el.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_PRECEDING : true)
      }) ?? candidates.find((el) => {
        const style = getComputedStyle(el)
        return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight
      })
      if (!list) throw new Error('未找到侧边栏历史滚动容器')
      list.scrollTop = list.scrollHeight
      list.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
  }

  static async waitForHistoryFooterOrTitle(title: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(title) || body.includes('加载更多') || body.includes('没有更多了')
    }, { timeout: 15000, interval: 300, timeoutMsg: `侧边栏滚动后未加载目标历史会话：${title}` })
  }

  static async logout(): Promise<void> {
    await this.waitForOpened()
    await this.logoutButton.waitForClickable({ timeout: 10000 })
    await this.logoutButton.click()
  }
}
