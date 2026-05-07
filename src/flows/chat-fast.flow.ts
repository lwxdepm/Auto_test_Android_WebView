import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { env } from '../config/env.js'
import { skipCase } from '../core/case-runner.js'
import { H5ApiClient } from '../core/h5-api-client.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { InputBarPage } from '../pages/InputBarPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { AuthFlow } from './auth.flow.js'

interface ChatSyncResponse {
  sessionId: string
  message?: {
    id: string
    role: string
    content: string
  } | null
  errorCode?: string
  errorMessage?: string
}

interface CreatedSession {
  id: string
  title: string | null
}

export class ChatFastFlow {
  static async openChat(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await ChatPage.waitForLoaded()
  }

  static async createCompletedAssistantSession(account: TestAccount, text: string): Promise<string> {
    await this.openChat(account)
    // 后端 chat 接口按用户做 1s 限流；不同 itCase 连续跑时主动留出间隔。
    await browser.pause(1100)
    const response = await H5ApiClient.post<ChatSyncResponse>('/chat/send-sync', { content: text })
    assert.ok(response.sessionId, `send-sync 未返回 sessionId：${JSON.stringify(response)}`)
    assert.ok(response.message?.id, `send-sync 未返回 AI 消息：${JSON.stringify(response)}`)
    if (response.errorCode || response.errorMessage) {
      throw new Error(`send-sync 返回错误：${response.errorCode || ''} ${response.errorMessage || ''}`.trim())
    }
    await H5Runtime.goto(`/chat/${response.sessionId}`)
    await ChatPage.waitForLoaded()
    await ChatPage.waitForAssistantFinal()
    return response.sessionId
  }

  static async cleanupSession(sessionId: string): Promise<void> {
    await H5ApiClient.delete(`/sessions/${sessionId}`).catch(() => undefined)
  }

  static async assertChatLoaded(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.expectCoreElements()
    await ChatPage.expectWelcome()
  }

  static async assertWelcomeSuggestions(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    await ChatPage.expectSuggestionQuestions()
  }

  static async assertSuggestionSend(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    const suggestion = '化疗后恶心该怎么办'
    await browser.pause(1100)
    await ChatPage.clickSuggestion(suggestion)
    await ChatPage.expectUserMessage(suggestion)
    await ChatPage.waitForGenerationStartedOrFinished()
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertNewChat(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.inputMessage('仅用于验证新对话按钮，不发送')
    await ChatPage.startNewChat()
  }

  static async assertTextSend(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    const text = `Appium文字发送${Date.now().toString().slice(-6)}`
    await browser.pause(1100)
    await InputBarPage.sendText(text)
    await ChatPage.expectUserMessage(text)
    await ChatPage.waitForGenerationStartedOrFinished()
    if (await ChatPage.waitForStopGeneratingButton(3000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertInputClearsAfterSend(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    const text = `Appium发送后清空${Date.now().toString().slice(-6)}`
    await browser.pause(1100)
    await InputBarPage.sendText(text)
    await InputBarPage.expectTextSent(text)
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertEnterSend(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    const text = `AppiumEnter发送${Date.now().toString().slice(-6)}`
    await browser.pause(1100)
    await InputBarPage.sendTextWithEnter(text)
    await ChatPage.expectUserMessage(text)
    await ChatPage.waitForGenerationStartedOrFinished()
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertStopGenerating(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    const text = `Appium停止生成验证：请用较长篇幅说明日常健康记录的注意事项 ${Date.now().toString().slice(-6)}`
    await browser.pause(1100)
    await InputBarPage.sendText(text)
    await ChatPage.expectUserMessage(text)
    if (!(await ChatPage.waitForStopGeneratingButton(12000))) {
      skipCase('当前环境未展示 SSE 流式“停止生成”按钮，可能已切到 sync 传输或响应结束过快')
    }
    await ChatPage.stopGenerating()
    await ChatPage.expectGenerationInterrupted()
  }

  static async assertStopThenRetry(account: TestAccount = accounts.normal): Promise<void> {
    await this.assertStopGenerating(account)
    await browser.pause(1100)
    await ChatPage.clickRetryAfterInterrupted()
    await ChatPage.expectRetryStartedOrFinished()
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertEditRetryAfterInterrupt(account: TestAccount = accounts.normal): Promise<void> {
    await this.assertStopGenerating(account)
    const newText = `Appium编辑重试${Date.now().toString().slice(-6)}`
    await browser.pause(1100)
    await ChatPage.editInterruptedUserMessageAndRetry(newText)
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertAssistantCopy(account: TestAccount = accounts.normal): Promise<void> {
    let sessionId = ''
    try {
      sessionId = await this.createCompletedAssistantSession(account, `Appium复制验证：请只回复一句“复制验证通过”。${Date.now().toString().slice(-6)}`)
      await ChatPage.clickAssistantCopyAndExpectSuccess()
    } finally {
      if (sessionId) await this.cleanupSession(sessionId)
    }
  }

  static async assertFeedbackLike(account: TestAccount = accounts.normal): Promise<void> {
    let sessionId = ''
    try {
      sessionId = await this.createCompletedAssistantSession(account, `Appium点赞验证：请只回复一句“点赞验证通过”。${Date.now().toString().slice(-6)}`)
      await ChatPage.clickFeedbackAndExpectSelected('like')
    } finally {
      if (sessionId) await this.cleanupSession(sessionId)
    }
  }

  static async assertFeedbackDislike(account: TestAccount = accounts.normal): Promise<void> {
    let sessionId = ''
    try {
      sessionId = await this.createCompletedAssistantSession(account, `Appium点踩验证：请只回复一句“点踩验证通过”。${Date.now().toString().slice(-6)}`)
      await ChatPage.clickFeedbackAndExpectSelected('dislike')
    } finally {
      if (sessionId) await this.cleanupSession(sessionId)
    }
  }

  static async assertShareToHere(account: TestAccount = accounts.normal): Promise<void> {
    let sessionId = ''
    try {
      sessionId = await this.createCompletedAssistantSession(account, `Appium分享验证：请只回复一句“分享验证通过”。${Date.now().toString().slice(-6)}`)
      await ChatPage.clickShareAndExpectCopied()
    } finally {
      if (sessionId) await this.cleanupSession(sessionId)
    }
  }

  static async assertDisclaimer(account: TestAccount = accounts.normal): Promise<void> {
    let sessionId = ''
    try {
      sessionId = await this.createCompletedAssistantSession(account, `Appium免责声明验证：请只回复一句“免责声明验证通过”。${Date.now().toString().slice(-6)}`)
      await ChatPage.expectDisclaimer()
    } finally {
      if (sessionId) await this.cleanupSession(sessionId)
    }
  }

  static async assertHistoryRestore(account: TestAccount = accounts.normal): Promise<void> {
    let sessionId = ''
    const text = `Appium历史恢复${Date.now().toString().slice(-6)}`
    try {
      sessionId = await this.createCompletedAssistantSession(account, text)
      await H5Runtime.goto('/chat')
      await ChatPage.waitForLoaded()
      await ChatPage.openDrawer()
      await SideDrawerPage.openLatestSession()
      await ChatPage.waitForLoaded()
      await browser.waitUntil(async () => (await H5Runtime.getPathname().catch(() => '')) === `/chat/${sessionId}`, {
        timeout: 10000,
        interval: 300,
        timeoutMsg: '从历史列表打开后未进入目标会话',
      })
      await ChatPage.expectUserMessage(text)
      await ChatPage.waitForAssistantFinal()
    } finally {
      if (sessionId) await this.cleanupSession(sessionId)
    }
  }

  static async assertDeleteHistorySession(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    const title = `Appium待删除会话${Date.now().toString().slice(-6)}`
    const created = await H5ApiClient.post<CreatedSession>('/sessions', { title })
    try {
      await ChatPage.openDrawer()
      await SideDrawerPage.deleteSessionByTitle(title)
      await SideDrawerPage.expectSessionTitleMissing(title)
    } finally {
      await this.cleanupSession(created.id)
      await SideDrawerPage.close().catch(() => undefined)
    }
  }

  static async assertDeleteCurrentSessionBackToNewChat(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    const title = `Appium删除当前会话${Date.now().toString().slice(-6)}`
    const created = await H5ApiClient.post<CreatedSession>('/sessions', { title })
    try {
      await H5Runtime.goto(`/chat/${created.id}`)
      await ChatPage.waitForLoaded()
      await ChatPage.openDrawer()
      await SideDrawerPage.deleteSessionByTitle(title)
      await ChatPage.expectWelcome()
      const path = await H5Runtime.getPathname()
      assert.equal(path, '/chat', `删除当前会话后应回到 /chat 新对话，实际=${path}`)
      await ChatPage.openDrawer()
      await SideDrawerPage.expectSessionTitleMissing(title)
    } finally {
      await this.cleanupSession(created.id)
      await SideDrawerPage.close().catch(() => undefined)
    }
  }

  static async assertLoadEarlierHistory(account: TestAccount = accounts.normal): Promise<void> {
    if (env.chatLongHistoryTurns < 16) {
      skipCase('CHAT_LONG_HISTORY_TURNS 小于 16，无法准备超过 30 条消息的历史会话')
    }

    await this.openChat(account)
    const suffix = Date.now().toString().slice(-6)
    const title = `Appium更早历史${suffix}`
    const firstMarker = `Appium更早历史首条${suffix}`
    const created = await H5ApiClient.post<CreatedSession>('/sessions', { title })
    try {
      for (let i = 0; i < env.chatLongHistoryTurns; i++) {
        await browser.pause(1100)
        const content = i === 0 ? firstMarker : `Appium更早历史第${i + 1}轮${suffix}`
        await H5ApiClient.post<ChatSyncResponse>('/chat/send-sync', {
          sessionId: created.id,
          content,
        })
      }
      await H5Runtime.goto(`/chat/${created.id}`)
      await ChatPage.waitForLoaded()
      const metrics = await ChatPage.scrollMessagesToTopAndExpect(firstMarker)
      assert.ok(metrics.afterHeight >= metrics.beforeHeight, `加载更早消息后 scrollHeight 不应减少：${JSON.stringify(metrics)}`)
      if (metrics.afterHeight > metrics.beforeHeight) {
        assert.ok(metrics.afterTop > 0, `加载更早消息后应补偿 scrollTop，避免阅读位置跳动：${JSON.stringify(metrics)}`)
      }
    } finally {
      await this.cleanupSession(created.id)
    }
  }

  static async assertSessionNotFound(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/chat/00000000-0000-4000-8000-000000000019')
    await ChatPage.expectNotFound()
  }

  static async assertNewChatSwitchNoCrossStream(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    const aText = `Appium会话A长回复${Date.now().toString().slice(-6)}`
    const bText = `Appium会话B${Date.now().toString().slice(-6)}`
    await browser.pause(1100)
    await InputBarPage.sendText(`${aText}：请用较长篇幅分点回答，方便测试流式切换。`)
    await ChatPage.expectUserMessage(aText)
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      return /^\/chat\/[^/]+$/.test(path)
    }, { timeout: 15000, interval: 300, timeoutMsg: '发送 A 后未进入具体会话路由' })
    const sessionA = await ChatPage.getCurrentSessionId()
    if (!(await ChatPage.waitForStopGeneratingButton(12000))) {
      skipCase('当前环境 A 会话未保持流式生成状态，无法验证新对话切换不串流')
    }

    await ChatPage.startNewChat()
    const bodyAfterNewChat = await H5Runtime.getBodyText()
    assert.ok(!bodyAfterNewChat.includes(aText), '点击新对话后新会话不应显示 A 会话消息')

    await browser.pause(1100)
    await InputBarPage.sendText(bText)
    await ChatPage.expectUserMessage(bText)
    const bodyB = await H5Runtime.getBodyText()
    assert.ok(!bodyB.includes(aText), 'B 会话不应串入 A 会话消息')
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }

    await H5Runtime.goto(`/chat/${sessionA}`)
    await ChatPage.waitForLoaded()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(aText) && !body.includes(bText)
    }, { timeout: 15000, interval: 300, timeoutMsg: '回到 A 会话后未恢复 A 消息或串入 B 消息' })
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertInputDefault(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await InputBarPage.expectDefaultState()
  }

  static async assertInputButtonChanges(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await InputBarPage.typeText('测试输入按钮变化')
    await InputBarPage.expectSendButtonState()
  }

  static async assertEmptyMessageCannotSend(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await InputBarPage.expectEmptyMessageCannotSend()
  }

  static async assertShiftEnterNewline(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await InputBarPage.expectShiftEnterNewline()
  }

  static async assertUploadAndVoiceEntry(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await InputBarPage.expectDefaultState()
  }

  static async assertImageUploadPreview(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    await InputBarPage.attachValidImageForPreview()
    await InputBarPage.expectImagePreview()
  }

  static async assertImagePreviewRemoved(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    await InputBarPage.attachValidImageForPreview()
    await InputBarPage.clickRemoveFirstImagePreview()
    await InputBarPage.expectNoImagePreview()
  }

  static async assertImageMessageSend(account: TestAccount = accounts.normal, imageOnly = false): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    await InputBarPage.attachValidImageForPreview()
    await InputBarPage.expectImagePreview()
    const text = imageOnly ? '' : `Appium图片消息${Date.now().toString().slice(-6)}`
    if (text) await InputBarPage.typeText(text)
    await browser.pause(1100)
    await InputBarPage.clickSendButton()
    await InputBarPage.expectImageMessageSent(1)
    if (text) await ChatPage.expectUserMessage(text)
    await ChatPage.waitForGenerationStartedOrFinished()
    if (await ChatPage.waitForStopGeneratingButton(1000)) {
      await ChatPage.stopGenerating()
      await ChatPage.expectGenerationInterrupted().catch(() => undefined)
    }
  }

  static async assertImageOnlyMessageSend(account: TestAccount = accounts.normal): Promise<void> {
    await this.assertImageMessageSend(account, true)
  }

  static async assertUnsupportedImageFormat(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    await InputBarPage.attachImageFiles({ mime: 'image/heic', extension: 'heic', tinyPng: false })
    await InputBarPage.expectToastContains('不支持的图片格式')
  }

  static async assertOversizeImageRejected(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    await InputBarPage.attachImageFiles({ sizeBytes: 10 * 1024 * 1024 + 1, mime: 'image/png', extension: 'png', tinyPng: false })
    await InputBarPage.expectToastContains('单张图片不能超过 10MB')
  }

  static async assertImageCountLimit(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    await InputBarPage.attachImageFiles({ count: 6 })
    await InputBarPage.expectPreviewCountAtMost(5)
    const state = await InputBarPage.getState()
    assert.ok(state.previewCount === 5 || state.bodyText.includes('最多上传 5 张图片'), `图片数量限制不符合预期：${JSON.stringify(state)}`)
  }

  static async assertVoiceUnsupportedHint(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    const support = await InputBarPage.expectVoiceUnsupportedOrSkipReady()
    if (support === 'supported') {
      skipCase('当前 WebView 支持录音能力，无法验证“不支持录音环境”的提示')
    }
    await InputBarPage.voiceButton.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('不支持') || body.includes('需要 HTTPS') || body.includes('麦克风')
    }, { timeout: 5000, interval: 300, timeoutMsg: '点击不支持录音入口后未出现提示' })
  }

  static async assertStreamingInputButtonState(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await ChatPage.startNewChat()
    const text = `Appium流式按钮状态：请用较长篇幅回答 ${Date.now().toString().slice(-6)}`
    await browser.pause(1100)
    await InputBarPage.sendText(text)
    await ChatPage.expectUserMessage(text)
    if (!(await ChatPage.waitForStopGeneratingButton(12000))) {
      skipCase('当前环境未展示 SSE 流式“停止生成”按钮，无法验证流式中输入区按钮状态')
    }
    await ChatPage.expectStreamingInputState()
    await ChatPage.stopGenerating()
    await ChatPage.expectGenerationInterrupted().catch(() => undefined)
  }

  static async assertLongTextLimit(account: TestAccount = accounts.normal): Promise<void> {
    await this.openChat(account)
    await InputBarPage.expectLongTextLimit()
  }
}
