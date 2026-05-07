import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'
import { selectors } from '../core/selectors.js'

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

export class MedicalRecordsPage {
  static get backButton() {
    return selectors.containsText('返回', 'button')
  }

  static get addButton() {
    return $('button svg line')
  }

  static get editMedicalProfileButton() {
    return selectors.exactText('编辑', 'button')
  }

  static get uploadFirstRecordButton() {
    return selectors.containsText('上传第一份病历', 'button')
  }

  static get cancelButton() {
    return selectors.exactText('取消', 'button')
  }

  static get healthConsentTitle() {
    return selectors.exactText('健康档案授权')
  }

  static async hasHealthConsentDialog(): Promise<boolean> {
    return this.healthConsentTitle.isDisplayed().catch(() => false)
  }

  static async waitForHealthConsentDialog(): Promise<void> {
    await this.healthConsentTitle.waitForDisplayed({ timeout: 15000 })
    await selectors.exactText('同意', 'button').waitForDisplayed({ timeout: 10000 })
    await selectors.exactText('不同意', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async waitForConsentOrLoaded(): Promise<'consent' | 'loaded'> {
    let state: 'consent' | 'loaded' | '' = ''
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      const path = await H5Runtime.getPathname().catch(() => '')
      if (body.includes('健康档案授权')) {
        state = 'consent'
        return true
      }
      if (path === '/medical-records' && body.includes('健康档案') && body.includes('病历档案')) {
        state = 'loaded'
        return true
      }
      return false
    }, { timeout: 20000, interval: 300, timeoutMsg: '健康档案授权弹窗或页面均未出现' })
    return state || 'loaded'
  }

  static async acceptHealthConsent(): Promise<void> {
    await this.waitForHealthConsentDialog()
    await selectors.exactText('同意', 'button').click()
    await this.waitForLoaded()
  }

  static async rejectHealthConsent(): Promise<void> {
    await this.waitForHealthConsentDialog()
    await selectors.exactText('不同意', 'button').click()
    await browser.waitUntil(async () => (await H5Runtime.getPathname().catch(() => '')) === '/chat', {
      timeout: 15000,
      interval: 300,
      timeoutMsg: '拒绝健康档案授权后未返回 /chat',
    })
  }

  static async waitForLoaded(): Promise<void> {
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      const body = await H5Runtime.getBodyText().catch(() => '')
      return path === '/medical-records' && body.includes('健康档案') && body.includes('病历档案') && body.includes('病历文档')
    }, { timeout: 20000, interval: 500, timeoutMsg: '健康档案页未加载' })
  }

  static async expectListOrEmptyDocuments(): Promise<void> {
    await this.waitForLoaded()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('暂无病历文档') || body.includes('上传于') || body.includes('删除')
    }, { timeout: 15000, interval: 300, timeoutMsg: '病历文档区域未展示空态或列表' })
    const body = await H5Runtime.getBodyText()
    assert.ok(
      body.includes('暂无病历文档') || body.includes('上传于') || body.includes('删除'),
      `病历文档区域未展示空态或列表，body=${body.slice(0, 300)}`,
    )
  }

  static async openMedicalProfileEdit(): Promise<void> {
    await this.editMedicalProfileButton.waitForClickable({ timeout: 10000 })
    await this.editMedicalProfileButton.click()
    await selectors.exactText('保存', 'button').waitForDisplayed({ timeout: 10000 })
    await selectors.exactText('取消', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static fieldLabel(label: string) {
    return $(`//label[contains(normalize-space(.), "${label}")]`)
  }

  static fieldTrigger(label: string) {
    return $(`//label[contains(normalize-space(.), "${label}")]/following-sibling::div//button[1]`)
  }

  static async clickFieldTrigger(label: string): Promise<void> {
    await H5Runtime.execute((targetLabel) => {
      const labels = Array.from(document.querySelectorAll('label'))
      const labelEl = labels.find((el) => (el.textContent || '').includes(targetLabel))
      const button = labelEl?.parentElement?.querySelector('button') as HTMLButtonElement | null
      if (!button) throw new Error(`未找到字段触发器：${targetLabel}`)
      button.scrollIntoView({ block: 'center', inline: 'nearest' })
      button.focus()
      button.click()
    }, label)
  }

  static async hasEditableField(label: string): Promise<boolean> {
    return this.fieldLabel(label).isDisplayed().catch(() => false)
  }

  static async selectFirstSingleOption(label: string, ariaLabel = label): Promise<void> {
    await this.clickFieldTrigger(label)
    const first = $(`//*[@role="listbox" and @aria-label="${ariaLabel}"]//*[@role="option"][1]`)
    await first.waitForDisplayed({ timeout: 10000 })
    await first.click()
  }

  static async openMedicationPanel(): Promise<void> {
    await this.clickFieldTrigger('用药情况')
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('常见药品') && body.includes('完成')
    }, { timeout: 10000, interval: 300, timeoutMsg: '用药情况面板未打开，未找到“常见药品/完成”' })
  }

  static async selectMedicationAlternative(label: '暂未用药' | '不确定'): Promise<void> {
    await this.openMedicationPanel()
    await H5Runtime.execute((target) => {
      const btn = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === target) as HTMLButtonElement | undefined
      if (!btn) throw new Error(`未找到用药选项：${target}`)
      btn.scrollIntoView({ block: 'center', inline: 'nearest' })
      btn.click()
    }, label)
    await this.clickPanelDone()
  }

  static async selectFirstCommonMedication(): Promise<void> {
    await this.openMedicationPanel()
    const label = await H5Runtime.execute(() => {
      const panelLabel = Array.from(document.querySelectorAll('div'))
        .find((el) => el.textContent?.trim() === '常见药品')
      const first = panelLabel?.nextElementSibling?.querySelector('button') as HTMLButtonElement | null
      if (!first) throw new Error('未找到第一个常见药品按钮')

      const labelText = (first.textContent || '').trim()
      const selected = first.getAttribute('aria-pressed') === 'true' || !!first.querySelector('svg')
      first.scrollIntoView({ block: 'center', inline: 'nearest' })
      if (!selected) first.click()
      return labelText
    })

    await browser.waitUntil(async () => {
      return H5Runtime.execute((target) => {
        const panelLabel = Array.from(document.querySelectorAll('div'))
          .find((el) => el.textContent?.trim() === '常见药品')
        const buttons = Array.from(panelLabel?.nextElementSibling?.querySelectorAll('button') || []) as HTMLButtonElement[]
        const targetButton = buttons.find((button) => (button.textContent || '').trim() === target)
        return !!targetButton
          && (targetButton.getAttribute('aria-pressed') === 'true' || !!targetButton.querySelector('svg'))
          && (document.body?.innerText || '').includes('已选')
      }, label).catch(() => false)
    }, { timeout: 5000, interval: 200, timeoutMsg: `选择常见药品后未出现面板内已选状态：${label}` })

    await this.clickPanelDone()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return !body.includes('常见药品') && (body.includes(label) || body.includes('已选'))
    }, { timeout: 5000, interval: 300, timeoutMsg: `选择常见药品后未展示已选状态：${label}` })
  }

  static async enterCustomMedicationText(value: string): Promise<void> {
    await this.openMedicationPanel()
    await H5Runtime.execute((text) => {
      const input = Array.from(document.querySelectorAll('input'))
        .find((el) => el.placeholder.includes('输入其他药品名')) as HTMLInputElement | undefined
      if (!input) throw new Error('未找到自定义药名输入框')
      input.scrollIntoView({ block: 'center', inline: 'nearest' })
      input.focus()
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, text)
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
  }

  static async typeCustomMedication(value: string): Promise<void> {
    await this.enterCustomMedicationText(value)
    await browser.waitUntil(async () => {
      return H5Runtime.execute(() => {
        const add = Array.from(document.querySelectorAll('button'))
          .find((button) => button.textContent?.trim() === '添加') as HTMLButtonElement | undefined
        return !!add && !add.disabled
      }).catch(() => false)
    }, { timeout: 5000, interval: 200, timeoutMsg: '自定义药名输入后添加按钮未变为可用' })

    await H5Runtime.execute(() => {
      const add = Array.from(document.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === '添加') as HTMLButtonElement | undefined
      if (!add) throw new Error('未找到添加按钮')
      add.click()
    })
  }

  static async clickPanelDone(): Promise<void> {
    await H5Runtime.execute(() => {
      const done = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === '完成') as HTMLButtonElement | undefined
      if (!done) throw new Error('未找到完成按钮')
      done.scrollIntoView({ block: 'center', inline: 'nearest' })
      done.click()
    })
  }

  static async addCustomMedicationAndFinish(value: string, expectedTexts: string[] = [value]): Promise<void> {
    await this.typeCustomMedication(value)
    await this.clickPanelDone()
    const body = await H5Runtime.getBodyText()
    for (const text of expectedTexts) {
      assert.ok(body.includes(text), `自定义药品添加后未展示：${text}`)
    }
  }

  static async expectMedicationCustomInputMaxLength(maxLength: number): Promise<void> {
    await browser.waitUntil(async () => {
      return H5Runtime.execute((limit) => {
        const input = Array.from(document.querySelectorAll('input'))
          .find((el) => el.placeholder.includes('输入其他药品名')) as HTMLInputElement | undefined
        if (!input) return false
        return Array.from(input.value).length <= limit
      }, maxLength).catch(() => false)
    }, { timeout: 5000, interval: 200, timeoutMsg: `自定义药名输入框未限制在 ${maxLength} 个字以内` })
  }

  static async expectMedicationCustomError(text: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(text)
    }, { timeout: 5000, interval: 300, timeoutMsg: `未出现自定义用药错误提示：${text}` })
  }

  static async closeMedicationPanelIfOpen(): Promise<void> {
    const wasOpen = await H5Runtime.execute(() => (document.body?.innerText || '').includes('常见药品')).catch(() => false)
    if (!wasOpen) return
    await H5Runtime.execute(() => {
      const labels = Array.from(document.querySelectorAll('label'))
      const labelEl = labels.find((el) => (el.textContent || '').includes('用药情况'))
      const trigger = labelEl?.parentElement?.querySelector('button') as HTMLButtonElement | null
      if (!trigger) throw new Error('未找到用药情况触发器')
      trigger.scrollIntoView({ block: 'center', inline: 'nearest' })
      trigger.click()
    })
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return !body.includes('常见药品')
    }, { timeout: 5000, interval: 200, timeoutMsg: '用药情况面板未关闭' })
  }

  static async cancelMedicalProfileEdit(): Promise<void> {
    await this.cancelButton.waitForClickable({ timeout: 10000 })
    await this.cancelButton.click()
    await selectors.exactText('编辑', 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async saveMedicalProfileEdit(): Promise<void> {
    const save = selectors.exactText('保存', 'button')
    await save.waitForClickable({ timeout: 10000 })
    await save.click()
    await selectors.exactText('编辑', 'button').waitForDisplayed({ timeout: 15000 })
  }

  static async openUploadPage(): Promise<void> {
    const uploadFirst = await this.uploadFirstRecordButton.isDisplayed().catch(() => false)
    if (uploadFirst) {
      await this.uploadFirstRecordButton.click()
    } else {
      // 顶部加号按钮没有文本，直接通过 DOM 找第一个 header 里的 button 点击。
      await H5Runtime.execute(() => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
        const add = buttons.find((button) => button.innerHTML.includes('<line x1="12" y1="5"') || button.textContent?.trim() === '')
        add?.click()
      })
    }
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('上传病历') && body.includes('上传病历图片')
    }, { timeout: 10000, interval: 300, timeoutMsg: '上传病历页未打开' })
  }

  static async expectUploadElements(): Promise<void> {
    const body = await H5Runtime.getBodyText()
    for (const text of ['上传病历图片', '拍照', '从相册选择', '取消']) {
      assert.ok(body.includes(text), `上传病历页缺少：${text}`)
    }
  }

  static async attachUnsupportedUploadFile(): Promise<void> {
    await H5Runtime.execute(() => {
      const albumInput = Array.from(document.querySelectorAll('input[type="file"]'))
        .find((input) => input.hasAttribute('multiple')) as HTMLInputElement | undefined
      const input = albumInput ?? document.querySelector('input[type="file"]') as HTMLInputElement | null
      if (!input) throw new Error('未找到病历上传 file input')

      const file = new File([new Uint8Array([0, 1, 2, 3, 4, 5])], 'appium-unsupported.heic', { type: 'image/heic' })
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
    })
  }

  static async expectUnsupportedUploadToast(): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('不支持的图片格式') && body.includes('JPG/PNG')
    }, { timeout: 8000, interval: 300, timeoutMsg: '选择不支持格式后未出现格式错误提示' })
  }

  static async cancelUpload(): Promise<void> {
    await selectors.exactText('取消', 'button').waitForClickable({ timeout: 10000 })
    await selectors.exactText('取消', 'button').click()
    await this.waitForLoaded()
  }

  static async hasDocumentList(): Promise<boolean> {
    await this.expectListOrEmptyDocuments().catch(() => undefined)
    const body = await H5Runtime.getBodyText()
    return body.includes('上传于') && body.includes('删除')
  }

  static async openFirstDocumentDetail(): Promise<void> {
    const uploadTime = selectors.containsText('上传于', 'span')
    await uploadTime.waitForClickable({ timeout: 10000 })
    await uploadTime.click()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes('删除此病历') || body.includes('返回列表')
    }, { timeout: 10000, interval: 300, timeoutMsg: '病历详情未打开' })
  }

  static async attachUploadImages(options: {
    count?: number
    sizeBytes?: number
    mime?: string
    extension?: string
    tinyPng?: boolean
  } = {}): Promise<void> {
    await H5Runtime.execute((base64, opts) => {
      const albumInput = Array.from(document.querySelectorAll('input[type="file"]'))
        .find((input) => input.hasAttribute('multiple')) as HTMLInputElement | undefined
      const input = albumInput ?? document.querySelector('input[type="file"]') as HTMLInputElement | null
      if (!input) throw new Error('未找到病历上传 file input')

      const count = opts.count ?? 1
      const mime = opts.mime ?? 'image/png'
      const extension = opts.extension ?? (mime.includes('jpeg') ? 'jpg' : mime.split('/')[1] || 'bin')
      const files: File[] = []

      for (let i = 0; i < count; i++) {
        if (opts.tinyPng !== false && !opts.sizeBytes) {
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
          files.push(new File([bytes], `appium-ocr-${i + 1}.png`, { type: 'image/png' }))
        } else {
          const bytes = new Uint8Array(opts.sizeBytes ?? 6)
          files.push(new File([bytes], `appium-ocr-${i + 1}.${extension}`, { type: mime }))
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

  static async expectUploadPreviewCount(expected: number): Promise<void> {
    await browser.waitUntil(async () => {
      return H5Runtime.execute((count) => {
        return document.querySelectorAll('img[alt^="病历 "]').length === count
      }, expected).catch(() => false)
    }, { timeout: 10000, interval: 300, timeoutMsg: `病历上传预览数量不符合预期：${expected}` })
  }

  static async expectUploadPreviewCountAtMost(max: number): Promise<void> {
    await browser.waitUntil(async () => {
      return H5Runtime.execute((limit) => {
        const count = document.querySelectorAll('img[alt^="病历 "]').length
        return count > 0 && count <= limit
      }, max).catch(() => false)
    }, { timeout: 10000, interval: 300, timeoutMsg: `病历上传预览数量未限制在 ${max} 张以内` })
  }

  static async removeFirstUploadPreview(): Promise<void> {
    await H5Runtime.execute(() => {
      const img = document.querySelector('img[alt^="病历 "]') as HTMLImageElement | null
      const button = img?.parentElement?.querySelector('button') as HTMLButtonElement | null
      if (!button) throw new Error('未找到病历图片删除按钮')
      button.click()
    })
  }

  static async expectStartOcrButton(count: number): Promise<void> {
    await selectors.exactText(`开始识别（${count}张）`, 'button').waitForDisplayed({ timeout: 10000 })
  }

  static async expectUploadToastContains(text: string): Promise<void> {
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(text)
    }, { timeout: 8000, interval: 300, timeoutMsg: `未出现病历上传提示：${text}` })
  }

  static async expectSingleMedicalProfileCardOnly(): Promise<void> {
    await this.waitForLoaded()
    const state = await H5Runtime.execute(() => {
      const body = document.body?.innerText || ''
      const cardTitles = Array.from(document.querySelectorAll('span,div,h1,h2'))
        .filter((el) => (el.textContent || '').trim() === '病历档案').length
      return {
        body,
        cardTitles,
        hasAddProfile: body.includes('新增档案') || body.includes('添加档案') || body.includes('切换档案'),
      }
    })
    assert.ok(state.cardTitles >= 1, `未找到病历档案卡片：${JSON.stringify(state)}`)
    assert.equal(state.hasAddProfile, false, 'MVP 单档案模式不应展示新增/切换档案入口')
  }

  static async expectEditableFieldVisible(label: string, visible: boolean): Promise<void> {
    const isVisible = await this.hasEditableField(label)
    assert.equal(isVisible, visible, `字段“${label}”可见性不符合预期，expected=${visible}, actual=${isVisible}`)
  }

  static async selectFirstSingleOptionAndReturnLabel(label: string, ariaLabel = label): Promise<string> {
    await this.clickFieldTrigger(label)
    const first = $(`//*[@role="listbox" and @aria-label="${ariaLabel}"]//*[@role="option"][1]`)
    await first.waitForDisplayed({ timeout: 10000 })
    const selected = (await first.getText()).trim()
    await first.click()
    return selected
  }

  static async savePendingCustomMedication(value: string): Promise<void> {
    await this.enterCustomMedicationText(value)
    await H5Runtime.execute(() => {
      const save = Array.from(document.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === '保存') as HTMLButtonElement | undefined
      if (!save) throw new Error('未找到保存按钮')
      save.scrollIntoView({ block: 'center', inline: 'nearest' })
      save.click()
    })
    await selectors.exactText('编辑', 'button').waitForDisplayed({ timeout: 15000 })
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(value)
    }, { timeout: 10000, interval: 300, timeoutMsg: `未点击添加的自定义药保存后未展示：${value}` })
  }

  static async openFirstDocumentImageLightbox(): Promise<void> {
    await this.openFirstDocumentDetail()
    const image = $('img[alt^="病历图片 "]')
    await image.waitForDisplayed({ timeout: 10000 })
    await image.click()
    await $('img[alt^="图片 "]').waitForDisplayed({ timeout: 10000 })
  }

  static async expectLightboxAndClose(): Promise<void> {
    await $('img[alt^="图片 "]').waitForDisplayed({ timeout: 10000 })
    const close = await H5Runtime.execute(() => {
      const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
      const closeButton = buttons.find((button) => button.innerHTML.includes('<line x1="18" y1="6"'))
      closeButton?.click()
      return !!closeButton
    })
    assert.equal(close, true, '未找到大图关闭按钮')
    await $('img[alt^="图片 "]').waitForDisplayed({ timeout: 5000, reverse: true })
  }

  static async expectDocumentDeleteCancelKeepsDetail(): Promise<void> {
    await this.openFirstDocumentDetail()
    await H5Runtime.execute(() => {
      window.confirm = () => false
    })
    const deleteButton = selectors.exactText('删除此病历', 'button')
    await deleteButton.waitForClickable({ timeout: 10000 })
    await deleteButton.click()
    await browser.pause(500)
    await deleteButton.waitForDisplayed({ timeout: 5000 })
  }

  static async getDetailImageCount(): Promise<number> {
    return H5Runtime.execute(() => document.querySelectorAll('img[alt^="病历图片 "]').length)
  }
}
