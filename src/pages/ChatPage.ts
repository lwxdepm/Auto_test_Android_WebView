import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { selectors } from '../core/selectors.js'
import { H5Runtime } from '../core/h5-runtime.js'

export class ChatPage {
  static get menuButton() {
    return $('button[title="对话记录"]')
  }

  static get newChatButton() {
    return $('button[title="新对话"]')
  }

  static get input() {
    return $('textarea[placeholder="输入您的问题..."]')
  }

  static get drawerDismissButton() {
    return $('button[aria-label="关闭对话记录"]')
  }

  static async waitForLoaded(): Promise<void> {
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      const body = await H5Runtime.getBodyText().catch(() => '')
      return path.startsWith('/chat') && body.includes('橙欣健康')
    }, {
      timeout: 20000,
      interval: 500,
      timeoutMsg: 'Chat 页面未加载完成。请确认 TEST_PHONE_A 是已完成资料的 active 账号。',
    })
  }

  static async openDrawer(): Promise<void> {
    await this.menuButton.waitForClickable({ timeout: 15000 })
    await this.menuButton.click()
    await selectors.containsText('个人信息', 'button').waitForDisplayed({ timeout: 15000 })
    await selectors.containsText('退出登录', 'button').waitForDisplayed({ timeout: 15000 })
  }

  static async closeDrawer(): Promise<void> {
    await this.drawerDismissButton.waitForClickable({ timeout: 10000 })
    await this.drawerDismissButton.click()
    await selectors.containsText('个人信息', 'button').waitForDisplayed({ timeout: 10000, reverse: true })
  }

  static async expectDrawerClosed(): Promise<void> {
    await selectors.containsText('个人信息', 'button').waitForDisplayed({ timeout: 10000, reverse: true })
  }

  static async expectWelcome(): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('你好，我是橙小欣') && body.includes('今天感觉怎么样')
    }, { timeout: 15000, interval: 300, timeoutMsg: '未显示新对话欢迎语' })
  }

  static async expectSuggestionQuestions(): Promise<void> {
    await this.expectWelcome()
    const body = await H5Runtime.getBodyText()
    for (const text of ['化疗后恶心该怎么办', '潮热失眠该怎么缓解', '关节酸痛该怎么缓解', '总是乏力需要注意吗']) {
      assert.ok(body.includes(text), `欢迎建议问题缺失：${text}`)
    }
  }

  static async clickSuggestion(text = '化疗后恶心该怎么办'): Promise<void> {
    await this.expectWelcome()
    const suggestion = selectors.containsText(text, 'button')
    await suggestion.waitForClickable({ timeout: 10000 })
    await suggestion.click()
  }

  static async startNewChat(): Promise<void> {
    await this.newChatButton.waitForClickable({ timeout: 15000 })
    await this.newChatButton.click()
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      return path === '/chat'
    }, { timeout: 10000, interval: 300, timeoutMsg: '点击新对话后未回到 /chat' })
    await this.expectWelcome()
  }

  static async triggerAuthedRequest(): Promise<void> {
    await this.openDrawer()
  }

  static async focusInput(): Promise<void> {
    await this.input.waitForDisplayed({ timeout: 15000 })
    await this.input.click()
  }

  static async inputMessage(text: string): Promise<void> {
    await this.input.waitForDisplayed({ timeout: 15000 })
    await this.input.setValue(text)
  }

  static async expectUserMessage(text: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      const inputValue = await H5Runtime.execute(() => {
        const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
        return textarea?.value ?? ''
      }).catch(() => '')
      return inputValue === '' && body.includes(text)
    }, { timeout: 10000, interval: 300, timeoutMsg: `未看到已发送的用户消息：${text}` })
  }

  static async waitForGenerationStartedOrFinished(timeout = 20000): Promise<void> {
    await browser.waitUntil(async () => {
      const stopVisible = await $('button[title="停止生成"], button[aria-label="停止生成"]').isDisplayed().catch(() => false)
      if (stopVisible) return true
      return H5Runtime.execute(() => {
        const body = document.body?.innerText || ''
        return body.includes('内容由AI生成仅供参考') || !!document.querySelector('button[title="复制"]')
      }).catch(() => false)
    }, { timeout, interval: 300, timeoutMsg: '发送后未看到 AI 回复开始或完成状态' })
  }

  static async waitForStopGeneratingButton(timeout = 15000): Promise<boolean> {
    try {
      await $('button[title="停止生成"], button[aria-label="停止生成"]').waitForClickable({ timeout })
      return true
    } catch {
      return false
    }
  }

  static async stopGenerating(): Promise<void> {
    const stop = $('button[title="停止生成"], button[aria-label="停止生成"]')
    await stop.waitForClickable({ timeout: 15000 })
    await stop.click()
  }

  static async stopGeneratingIfVisible(): Promise<boolean> {
    const stop = $('button[title="停止生成"], button[aria-label="停止生成"]')
    if (!(await stop.isClickable().catch(() => false))) return false
    await stop.click()
    return true
  }

  static async expectGenerationInterrupted(): Promise<void> {
    await browser.waitUntil(async () => {
      const stopVisible = await $('button[title="停止生成"], button[aria-label="停止生成"]').isDisplayed().catch(() => false)
      const body = await H5Runtime.getBodyText().catch(() => '')
      return !stopVisible && body.includes('已中断')
    }, { timeout: 20000, interval: 300, timeoutMsg: '点击停止生成后未展示“已中断”状态' })
  }

  static async waitForAssistantFinal(timeout = 60000): Promise<void> {
    await browser.waitUntil(async () => {
      const stopVisible = await $('button[title="停止生成"], button[aria-label="停止生成"]').isDisplayed().catch(() => false)
      if (stopVisible) return false
      return H5Runtime.execute(() => {
        const body = document.body?.innerText || ''
        return body.includes('内容由AI生成仅供参考') && !!document.querySelector('button[title="复制"]')
      }).catch(() => false)
    }, { timeout, interval: 500, timeoutMsg: '未等到完整 AI 回复及操作栏' })
  }

  static async clickRetryAfterInterrupted(): Promise<void> {
    const retry = selectors.containsText('重试', 'button')
    await retry.waitForClickable({ timeout: 10000 })
    await retry.click()
  }

  static async expectRetryStartedOrFinished(): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      const stopVisible = await $('button[title="停止生成"], button[aria-label="停止生成"]').isDisplayed().catch(() => false)
      const finalVisible = await H5Runtime.execute(() => !!document.querySelector('button[title="复制"]')).catch(() => false)
      return !body.includes('已中断') && (stopVisible || finalVisible)
    }, { timeout: 20000, interval: 300, timeoutMsg: '点击重试后未重新进入生成或完成状态' })
  }

  static async clickAssistantCopyAndExpectSuccess(): Promise<void> {
    await this.stubClipboardSuccess()
    const copy = $('button[title="复制"]')
    await copy.waitForClickable({ timeout: 10000 })
    await copy.click()
    await browser.waitUntil(async () => {
      return H5Runtime.execute(() => !!document.querySelector('button[title="复制"] svg polyline[points="20 6 9 17 4 12"]')).catch(() => false)
    }, { timeout: 5000, interval: 200, timeoutMsg: '点击复制后未显示复制成功状态' })
  }

  static async clickFeedbackAndExpectSelected(kind: 'like' | 'dislike'): Promise<void> {
    const title = kind === 'like' ? '有帮助' : '没帮助'
    const feedback = $(`button[title="${title}"]`)
    await feedback.waitForClickable({ timeout: 10000 })
    await feedback.click()
    await browser.waitUntil(async () => {
      const selected = await $(`button[title="${title}"][aria-pressed="true"]`).isDisplayed().catch(() => false)
      if (selected) return true
      return H5Runtime.execute((targetTitle) => {
        const button = document.querySelector(`button[title="${targetTitle}"]`)
        return button?.getAttribute('aria-pressed') === 'true'
      }, title).catch(() => false)
    }, { timeout: 8000, interval: 300, timeoutMsg: `点击“${title}”后未进入选中态` })
  }

  static async clickShareAndExpectCopied(): Promise<void> {
    await this.stubClipboardSuccess()
    const share = $('button[title="分享至此"]')
    await share.waitForClickable({ timeout: 10000 })
    await share.click()
    await $('button[title="链接已复制"]').waitForDisplayed({ timeout: 10000 })
  }

  static async expectDisclaimer(): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('内容由AI生成仅供参考') && body.includes('持续不适请及时就医')
    }, { timeout: 10000, interval: 300, timeoutMsg: 'AI 回复底部未展示内容免责声明' })
  }

  static async expectNotFound(): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('对话不存在或无权访问') && body.includes('开启新对话')
    }, { timeout: 15000, interval: 300, timeoutMsg: '不存在的会话未展示 not found 状态' })
  }

  static async getCurrentSessionId(): Promise<string> {
    const path = await H5Runtime.getPathname()
    const match = path.match(/^\/chat\/([^/?#]+)/)
    if (!match) throw new Error(`当前不在具体会话路由：${path}`)
    return match[1]
  }

  static async stubClipboardSuccess(): Promise<void> {
    await H5Runtime.execute(() => {
      const doc = document as Document & { execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean }
      const original = doc.execCommand?.bind(document)
      doc.execCommand = (commandId: string, showUI?: boolean, value?: string) => {
        if (String(commandId).toLowerCase() === 'copy') return true
        return original ? original(commandId, showUI, value) : false
      }
    }).catch(() => undefined)
  }

  static async expectCoreElements(): Promise<void> {
    await this.waitForLoaded()
    await this.menuButton.waitForDisplayed({ timeout: 10000 })
    await this.newChatButton.waitForDisplayed({ timeout: 10000 })
    await this.input.waitForDisplayed({ timeout: 10000 })
  }

  static async expectInputVisibleAboveKeyboard(): Promise<void> {
    await this.focusInput()
    await browser.pause(800)
    const info = await H5Runtime.execute(() => {
      const el = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const vv = window.visualViewport
      return {
        rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
        innerHeight: window.innerHeight,
        visualViewportHeight: vv?.height ?? null,
        visualViewportOffsetTop: vv?.offsetTop ?? null,
        keyboardOffset: getComputedStyle(document.documentElement).getPropertyValue('--keyboard-offset').trim(),
      }
    })
    assert.ok(info, '未找到 Chat 输入框')
    const visibleBottom = (info.visualViewportHeight ?? info.innerHeight) + (info.visualViewportOffsetTop ?? 0)
    assert.ok(info.rect.bottom <= visibleBottom + 12, `输入框可能被软键盘遮挡：${JSON.stringify(info)}`)
  }

  static async expectStreamingInputState(): Promise<void> {
    await browser.waitUntil(async () => {
      const stopVisible = await $('button[title="停止生成"], button[aria-label="停止生成"]').isDisplayed().catch(() => false)
      if (!stopVisible) return false
      return H5Runtime.execute(() => {
        const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
        const row = textarea?.parentElement
        const voice = row?.querySelector('button[title="语音输入"], button[aria-label="语音输入"]') as HTMLButtonElement | null
        return !voice || voice.disabled
      }).catch(() => false)
    }, { timeout: 15000, interval: 300, timeoutMsg: '流式生成中未展示停止按钮，或语音按钮未禁用/替换' })
  }

  static async editInterruptedUserMessageAndRetry(newText: string): Promise<void> {
    const edit = $('button[title="编辑"], button[aria-label="编辑"]')
    await edit.waitForClickable({ timeout: 10000 })
    await edit.click()
    const editor = $('textarea[placeholder="编辑后重新生成..."]')
    await editor.waitForDisplayed({ timeout: 5000 })
    await editor.setValue(newText)
    const saveRetry = selectors.exactText('保存并重试', 'button')
    await saveRetry.waitForClickable({ timeout: 5000 })
    await saveRetry.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      const stopVisible = await $('button[title="停止生成"], button[aria-label="停止生成"]').isDisplayed().catch(() => false)
      const finalVisible = await H5Runtime.execute(() => !!document.querySelector('button[title="复制"]')).catch(() => false)
      return body.includes(newText) && !body.includes('已中断') && (stopVisible || finalVisible)
    }, { timeout: 20000, interval: 300, timeoutMsg: '编辑后保存并重试未重新生成' })
  }

  static async scrollMessagesToTopAndExpect(text: string): Promise<{ beforeTop: number; afterTop: number; beforeHeight: number; afterHeight: number }> {
    const before = await H5Runtime.execute(() => {
      const containers = Array.from(document.querySelectorAll('div')) as HTMLDivElement[]
      const scrollEl = containers.find((el) => {
        const style = getComputedStyle(el)
        return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 40
      }) ?? document.scrollingElement as HTMLElement | null
      if (!scrollEl) throw new Error('未找到消息滚动容器')
      return { top: scrollEl.scrollTop, height: scrollEl.scrollHeight }
    })

    await H5Runtime.execute(() => {
      const containers = Array.from(document.querySelectorAll('div')) as HTMLDivElement[]
      const scrollEl = containers.find((el) => {
        const style = getComputedStyle(el)
        return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 40
      }) ?? document.scrollingElement as HTMLElement | null
      if (!scrollEl) throw new Error('未找到消息滚动容器')
      scrollEl.scrollTop = 0
      scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }))
    })

    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(text)
    }, { timeout: 20000, interval: 500, timeoutMsg: `上滑到顶部后未加载更早消息：${text}` })

    const after = await H5Runtime.execute(() => {
      const containers = Array.from(document.querySelectorAll('div')) as HTMLDivElement[]
      const scrollEl = containers.find((el) => {
        const style = getComputedStyle(el)
        return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 40
      }) ?? document.scrollingElement as HTMLElement | null
      if (!scrollEl) throw new Error('未找到消息滚动容器')
      return { top: scrollEl.scrollTop, height: scrollEl.scrollHeight }
    })

    return {
      beforeTop: before.top,
      afterTop: after.top,
      beforeHeight: before.height,
      afterHeight: after.height,
    }
  }
}
