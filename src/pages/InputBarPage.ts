import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
const voiceTestTimeoutMs = 5000

export class InputBarPage {
  static get textarea() {
    return $('textarea[placeholder="输入您的问题..."]')
  }

  static get uploadButton() {
    return $('button[title="上传图片"]')
  }

  static get voiceButton() {
    return $('[aria-label="语音输入"], [title="语音输入"]')
  }


  static async clickNativeUploadButton(): Promise<void> {
    await this.uploadButton.waitForClickable({ timeout: 10000 })
    await this.uploadButton.click()
  }

  static async clickVoiceButton(): Promise<void> {
    await this.voiceButton.waitForClickable({ timeout: voiceTestTimeoutMs })
    await this.voiceButton.click()
  }

  static async getVoiceState() {
    return H5Runtime.execute(() => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."], textarea[placeholder="正在听您说..."]') as HTMLTextAreaElement | null
      const stop = document.querySelector('button[aria-label="停止录音"], button[title^="停止录音"]') as HTMLButtonElement | null
      const voice = document.querySelector('[aria-label="语音输入"], [title="语音输入"]') as HTMLButtonElement | null
      return {
        placeholder: textarea?.getAttribute('placeholder') ?? '',
        value: textarea?.value ?? '',
        hasStopRecordingButton: !!stop,
        hasVoiceButton: !!voice,
        voiceDisabled: voice?.disabled ?? null,
        bodyText: document.body?.innerText ?? '',
      }
    })
  }

  static async expectRecordingStarted(): Promise<void> {
    await browser.waitUntil(async () => {
      const state = await this.getVoiceState().catch(() => null)
      return !!state && (state.placeholder.includes('正在听') || state.hasStopRecordingButton)
    }, { timeout: voiceTestTimeoutMs, interval: 300, timeoutMsg: '点击语音后 5s 内未进入录音态：未看到“正在听您说...”或“停止录音”按钮' })
  }

  static async stopRecording(): Promise<void> {
    const stop = $('button[aria-label="停止录音"], button[title^="停止录音"]')
    if (await stop.isDisplayed().catch(() => false)) {
      await stop.click()
      return
    }
    await this.clickVoiceButton()
  }

  static async expectRecordingStopped(): Promise<void> {
    await browser.waitUntil(async () => {
      const state = await this.getVoiceState().catch(() => null)
      return !!state && !state.placeholder.includes('正在听') && !state.hasStopRecordingButton
    }, { timeout: voiceTestTimeoutMs, interval: 300, timeoutMsg: '停止录音后 5s 内未恢复普通输入态' })
  }

  static async expectVoiceErrorContains(texts: string[]): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return texts.some((text) => body.includes(text))
    }, { timeout: voiceTestTimeoutMs, interval: 300, timeoutMsg: `5s 内未出现语音错误提示：${texts.join(' / ')}` })
  }

  static async getState() {
    return H5Runtime.execute(() => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      const row = textarea?.parentElement
      const upload = row?.querySelector('button[title="上传图片"]') as HTMLButtonElement | null
      const buttons = Array.from(row?.querySelectorAll('button') || []) as HTMLButtonElement[]
      const actionButtons = buttons.filter((button) => button !== upload)
      const action = actionButtons[actionButtons.length - 1] ?? null
      return {
        textareaVisible: !!textarea,
        textareaValue: textarea?.value ?? '',
        uploadVisible: !!upload,
        uploadDisabled: upload?.disabled ?? null,
        previewCount: document.querySelectorAll('img[alt^="预览 "]').length,
        actionButtonCount: actionButtons.length,
        actionDisabled: action?.disabled ?? null,
        actionTitle: action?.getAttribute('title') ?? '',
        actionAriaLabel: action?.getAttribute('aria-label') ?? '',
        actionHasExplicitLabel: !!(action?.getAttribute('title') || action?.getAttribute('aria-label')),
        bodyText: document.body?.innerText ?? '',
      }
    })
  }

  static async expectDefaultState(): Promise<void> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    await this.uploadButton.waitForDisplayed({ timeout: 10000 })
    const state = await this.getState()
    assert.ok(state.textareaVisible, '默认状态应展示输入框')
    assert.ok(state.uploadVisible, '默认状态应展示图片上传入口')
    assert.ok(state.actionButtonCount >= 1, '默认状态应展示右侧语音/动作按钮')
    assert.ok(
      state.actionHasExplicitLabel || state.actionTitle.includes('录音') || state.actionAriaLabel.includes('录音'),
      `默认右侧按钮应是语音/录音入口，实际=${JSON.stringify(state)}`,
    )
  }

  static async typeText(text: string): Promise<void> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    await this.textarea.setValue(text)
  }

  static async clickSendButton(): Promise<void> {
    await this.expectSendButtonState()
    await H5Runtime.execute(() => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      const row = textarea?.parentElement
      const upload = row?.querySelector('button[title="上传图片"]')
      const action = Array.from(row?.querySelectorAll('button') || [])
        .filter((button) => button !== upload)
        .at(-1) as HTMLButtonElement | undefined
      if (!action) throw new Error('未找到发送按钮')
      action.click()
    })
  }

  static async sendText(text: string): Promise<void> {
    await this.typeText(text)
    await this.clickSendButton()
  }

  static async sendTextWithEnter(text: string): Promise<void> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    await this.textarea.click()
    await this.textarea.setValue(text)
    await browser.keys('Enter')
  }

  static async expectTextSent(text: string): Promise<void> {
    await browser.waitUntil(async () => {
      const state = await this.getState()
      return state.textareaValue === '' && state.bodyText.includes(text)
    }, { timeout: 8000, interval: 300, timeoutMsg: `发送后未看到用户消息或输入框未清空：${text}` })
  }

  static async expectSendButtonState(): Promise<void> {
    await browser.waitUntil(async () => {
      const state = await this.getState()
      return (state.textareaValue.trim().length > 0 || state.previewCount > 0)
        && !state.actionHasExplicitLabel
        && state.actionDisabled === false
    }, { timeout: 5000, timeoutMsg: '输入文字/选择图片后语音按钮未切换为发送按钮' })
  }

  static async expectShiftEnterNewline(): Promise<void> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    await H5Runtime.execute(() => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      if (!textarea) throw new Error('未找到输入框')
      textarea.focus()
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(textarea, '第一行')
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: '第一行', inputType: 'insertText' }))
    })
    await browser.keys(['Shift', 'Enter'])
    await browser.keys('第二行')
    const value = await H5Runtime.execute(() => (document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null)?.value ?? '')
    assert.ok(value.includes('\n') || value.includes('第二行'), `Shift+Enter 后输入值异常：${JSON.stringify(value)}`)
  }

  static async expectEmptyMessageCannotSend(): Promise<void> {
    await this.textarea.setValue('')
    await browser.pause(200)
    const state = await this.getState()
    assert.equal(state.textareaValue, '')
    assert.ok(state.actionHasExplicitLabel, `空消息时应显示语音/录音按钮而非发送按钮，实际=${JSON.stringify(state)}`)
  }

  static async expectLongTextLimit(): Promise<void> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    await H5Runtime.execute(() => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      if (!textarea) throw new Error('未找到输入框')
      const value = '长'.repeat(100001)
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(textarea, value)
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
    })
    await browser.waitUntil(async () => {
      const state = await this.getState()
      return state.bodyText.includes('文本过长') && state.actionDisabled === true
    }, { timeout: 5000, interval: 300, timeoutMsg: '超长文本未显示限制提示或发送按钮未禁用' })
  }

  static async attachValidImageForPreview(): Promise<void> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    await H5Runtime.execute((base64) => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      const row = textarea?.parentElement
      const input = row?.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement | null
      if (!input) throw new Error('未找到聊天图片上传 input')

      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const file = new File([bytes], 'appium-preview.png', { type: 'image/png' })

      let files: FileList | (File[] & { item?: (index: number) => File | null })
      if (typeof DataTransfer !== 'undefined') {
        const dt = new DataTransfer()
        dt.items.add(file)
        files = dt.files
      } else {
        const fallback = [file] as File[] & { item?: (index: number) => File | null }
        fallback.item = (index: number) => fallback[index] ?? null
        files = fallback
      }

      Object.defineProperty(input, 'files', { value: files, configurable: true })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, tinyPngBase64)
  }

  static async expectImagePreview(): Promise<void> {
    await browser.waitUntil(async () => {
      return H5Runtime.execute(() => {
        const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
        const bar = textarea?.closest('div')
        const previews = Array.from(document.querySelectorAll('img[alt^="预览 "]')) as HTMLImageElement[]
        const removeButtons = Array.from(document.querySelectorAll('button'))
          .filter((button) => button.querySelector('svg line[x1="18"][y1="6"]'))
        const row = textarea?.parentElement
        const upload = row?.querySelector('button[title="上传图片"]')
        const action = Array.from(row?.querySelectorAll('button') || [])
          .filter((button) => button !== upload)
          .at(-1) as HTMLButtonElement | undefined
        return {
          previewCount: previews.length,
          hasPreviewNearInput: !!bar && previews.some((img) => !!img.closest('div')),
          removeButtonCount: removeButtons.length,
          actionIsSend: !!action && !action.getAttribute('title') && !action.getAttribute('aria-label') && !action.disabled,
        }
      }).then((state) => state.previewCount > 0 && state.hasPreviewNearInput && state.removeButtonCount > 0 && state.actionIsSend)
    }, { timeout: 8000, interval: 300, timeoutMsg: '选择图片后未展示预览或发送按钮未切换' })
  }

  static async attachImageFiles(options: {
    count?: number
    sizeBytes?: number
    mime?: string
    extension?: string
    tinyPng?: boolean
  } = {}): Promise<void> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    await H5Runtime.execute((base64, opts) => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      const row = textarea?.parentElement
      const input = row?.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement | null
      if (!input) throw new Error('未找到聊天图片上传 input')

      const count = opts.count ?? 1
      const mime = opts.mime ?? 'image/png'
      const extension = opts.extension ?? (mime.includes('jpeg') ? 'jpg' : mime.split('/')[1] || 'bin')
      const files: File[] = []

      for (let i = 0; i < count; i++) {
        if (opts.tinyPng !== false && !opts.sizeBytes) {
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
          files.push(new File([bytes], `appium-${i + 1}.png`, { type: 'image/png' }))
        } else {
          const bytes = new Uint8Array(opts.sizeBytes ?? 6)
          bytes[0] = 0
          files.push(new File([bytes], `appium-${i + 1}.${extension}`, { type: mime }))
        }
      }

      let fileList: FileList | (File[] & { item?: (index: number) => File | null })
      if (typeof DataTransfer !== 'undefined') {
        const dt = new DataTransfer()
        for (const file of files) dt.items.add(file)
        fileList = dt.files
      } else {
        const fallback = files as File[] & { item?: (index: number) => File | null }
        fallback.item = (index: number) => fallback[index] ?? null
        fileList = fallback
      }

      Object.defineProperty(input, 'files', { value: fileList, configurable: true })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, tinyPngBase64, options)
  }

  static async clickRemoveFirstImagePreview(): Promise<void> {
    await this.expectImagePreview()
    await H5Runtime.execute(() => {
      const img = document.querySelector('img[alt^="预览 "]') as HTMLImageElement | null
      const button = img?.parentElement?.querySelector('button') as HTMLButtonElement | null
      if (!button) throw new Error('未找到图片预览删除按钮')
      button.click()
    })
  }

  static async expectNoImagePreview(): Promise<void> {
    await browser.waitUntil(async () => {
      const state = await this.getState()
      return state.previewCount === 0 && state.actionHasExplicitLabel
    }, { timeout: 5000, interval: 300, timeoutMsg: '删除图片后预览未消失或按钮未恢复默认态' })
  }

  static async expectPreviewCount(expected: number): Promise<void> {
    await browser.waitUntil(async () => {
      const state = await this.getState()
      return state.previewCount === expected
    }, { timeout: 8000, interval: 300, timeoutMsg: `图片预览数量不符合预期：${expected}` })
  }

  static async expectPreviewCountAtMost(max: number): Promise<void> {
    await browser.waitUntil(async () => {
      const state = await this.getState()
      return state.previewCount > 0 && state.previewCount <= max
    }, { timeout: 8000, interval: 300, timeoutMsg: `图片预览数量未限制在 ${max} 张以内` })
  }

  static async expectToastContains(text: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(text)
    }, { timeout: 8000, interval: 300, timeoutMsg: `未出现输入框提示：${text}` })
  }

  static async expectImageMessageSent(minImages = 1): Promise<void> {
    await browser.waitUntil(async () => {
      return H5Runtime.execute((min) => {
        const previewCount = document.querySelectorAll('img[alt^="预览 "]').length
        const sentImageCount = document.querySelectorAll('img[alt^="上传图片 "]').length
        return previewCount === 0 && sentImageCount >= min
      }, minImages).catch(() => false)
    }, { timeout: 12000, interval: 300, timeoutMsg: `发送后未看到用户图片消息，期望图片数>=${minImages}` })
  }

  static async expectVoiceUnsupportedOrSkipReady(): Promise<'unsupported' | 'supported'> {
    await this.textarea.waitForDisplayed({ timeout: 10000 })
    const state = await this.getState()
    if (state.actionAriaLabel.includes('不支持') || state.actionAriaLabel.includes('需要 HTTPS') || state.actionTitle.includes('不支持')) {
      return 'unsupported'
    }
    return 'supported'
  }
}
