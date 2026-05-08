import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import { env } from '../config/env.js'
import { WebViewContext } from '../core/webview-context.js'
import { H5Runtime } from '../core/h5-runtime.js'

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

function normalizeShellResult(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return [record.stdout, record.stderr, record.output]
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .join('\n')
  }
  return String(value ?? '')
}

function escapeXpathLiteral(text: string): string {
  if (!text.includes("'")) return `'${text}'`
  if (!text.includes('"')) return `"${text}"`
  return `concat(${text.split("'").map((part) => `'${part}'`).join(', "\'", ')})`
}

export interface ShellResult {
  ok: boolean
  output: string
  error?: string
}

export class NativeBridgePage {
  static readonly albumImageName = 'appium-bridge-album.png'
  static readonly albumImagePaths = [
    `/sdcard/DCIM/Camera/${NativeBridgePage.albumImageName}`,
    `/sdcard/Pictures/${NativeBridgePage.albumImageName}`,
    `/sdcard/Download/${NativeBridgePage.albumImageName}`,
  ]
  static readonly albumImagePath = NativeBridgePage.albumImagePaths[0]

  static async shell(command: string, args: string[] = [], options: { timeout?: number; allowFail?: boolean } = {}): Promise<ShellResult> {
    try {
      // Appium 的 mobile: shell 是 UiAutomator2/NATIVE_APP 扩展命令。
      // 如果当前停在 WEBVIEW context，Chromedriver 会返回 “Method is not implemented”。
      await WebViewContext.switchToNative().catch(() => undefined)
      const output = normalizeShellResult(await (browser as any).execute('mobile: shell', {
        command,
        args,
        includeStderr: true,
        timeout: options.timeout ?? 5000,
      }))
      return { ok: true, output }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!options.allowFail) throw err
      return { ok: false, output: message, error: message }
    }
  }

  static async pushAlbumFixture(): Promise<void> {
    await WebViewContext.switchToNative().catch(() => undefined)
    for (const imagePath of this.albumImagePaths) {
      await this.shell('mkdir', ['-p', imagePath.replace(/\/[^/]+$/, '')], { allowFail: true })
      await (browser as any).pushFile(imagePath, tinyPngBase64)
      await this.shell('am', [
        'broadcast',
        '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
        '-d', `file://${imagePath}`,
      ], { allowFail: true })
    }
    await browser.pause(2000)
  }

  static async grantPermission(permission: string): Promise<ShellResult> {
    if (!env.androidAppPackage) throw new Error('ANDROID_APP_PACKAGE 未配置')
    const grant = await this.shell('pm', ['grant', env.androidAppPackage, permission], { allowFail: true })
    await this.shell('appops', ['set', env.androidAppPackage, permission.replace('android.permission.', ''), 'allow'], { allowFail: true })
    return grant
  }

  static async revokePermission(permission: string): Promise<ShellResult> {
    if (!env.androidAppPackage) throw new Error('ANDROID_APP_PACKAGE 未配置')
    const revoke = await this.shell('pm', ['revoke', env.androidAppPackage, permission], { allowFail: true })
    await this.shell('appops', ['set', env.androidAppPackage, permission.replace('android.permission.', ''), 'deny'], { allowFail: true })
    return revoke
  }

  static async resetPermissionAppOp(permission: string): Promise<void> {
    if (!env.androidAppPackage) return
    await this.shell('appops', ['set', env.androidAppPackage, permission.replace('android.permission.', ''), 'allow'], { allowFail: true })
  }

  static async getWindowDump(): Promise<string> {
    return (await this.shell('dumpsys', ['window'], { allowFail: true, timeout: 5000 })).output
  }

  static packageFromWindowDump(text: string): string {
    return text.match(/mCurrentFocus=.*?\s([A-Za-z0-9_.]+)\//)?.[1]
      || text.match(/mFocusedApp=.*?\s([A-Za-z0-9_.]+)\//)?.[1]
      || text.match(/WindowStateAnimator\{[^}]+\s([A-Za-z0-9_.]+)\//)?.[1]
      || ''
  }

  static looksLikeSystemPicker(text: string): boolean {
    return /com\.android\.photopicker|com\.google\.android\.providers\.media|com\.android\.documentsui|DocumentsUI|PhotoPicker|Photopicker|GetContent|Photo Picker/i.test(text)
  }

  static looksLikeCamera(text: string): boolean {
    return /camera|相机|com\.android\.camera|GoogleCamera|com\.vivo\.camera/i.test(text)
  }

  static async getNativeSnapshot(options: { includeSource?: boolean } = {}): Promise<{ currentPackage: string; source: string; dump: string }> {
    await WebViewContext.switchToNative().catch(() => undefined)
    const dump = await this.getWindowDump()
    const source = options.includeSource ? await browser.getPageSource().catch(() => '') : ''
    return { currentPackage: this.packageFromWindowDump(dump), source, dump }
  }

  static async expectNativeChooserOpened(reason: string): Promise<void> {
    await WebViewContext.switchToNative()
    let latest = { currentPackage: '', source: '', dump: '' }
    await browser.waitUntil(async () => {
      latest = await this.getNativeSnapshot()
      const pkg = latest.currentPackage
      return (!!pkg && pkg !== env.androidAppPackage)
        || this.looksLikeSystemPicker(latest.dump)
        || this.looksLikeCamera(latest.dump)
    }, {
      timeout: 10000,
      interval: 500,
      timeoutMsg: `${reason} 后未打开原生选择器/相机。currentPackage=${latest.currentPackage || '(unknown)'}。这通常说明 Android WebView 壳缺少 WebChromeClient.onShowFileChooser / capture bridge。`,
    })
  }

  static async isNativePickerStillOpen(): Promise<boolean> {
    const dump = await this.getWindowDump()
    return this.looksLikeSystemPicker(dump)
  }

  static async isCameraStillOpen(): Promise<boolean> {
    const dump = await this.getWindowDump()
    return this.looksLikeCamera(dump)
  }

  static async tapByRatio(xRatio: number, yRatio: number): Promise<void> {
    await WebViewContext.switchToNative().catch(() => undefined)
    const size = await browser.getWindowSize()
    const x = Math.max(1, Math.min(size.width - 1, Math.round(size.width * xRatio)))
    const y = Math.max(1, Math.min(size.height - 1, Math.round(size.height * yRatio)))
    // 用 adb input tap，避免部分 ROM/Photo Picker 的 accessibility tree 查询很慢导致 findElement/source 超时。
    await this.shell('input', ['tap', String(x), String(y)], { allowFail: true, timeout: 5000 })
  }

  static async clickIfVisibleByAnyText(texts: string[], timeout = 800): Promise<boolean> {
    await WebViewContext.switchToNative().catch(() => undefined)
    for (const text of texts) {
      const literal = escapeXpathLiteral(text)
      const el = $(`//*[contains(@text, ${literal}) or contains(@content-desc, ${literal})]`)
      if (await el.isDisplayed().catch(() => false)) {
        await el.click()
        return true
      }
      await browser.pause(Math.min(timeout, 200))
    }
    return false
  }

  static async denyPermissionIfVisible(): Promise<boolean> {
    return this.clickIfVisibleByAnyText([
      '不允许', '拒绝', '禁止', 'Deny', "Don’t allow", "Don't allow", 'Not allow', 'Cancel', '取消',
    ], 200)
  }

  static async allowPermissionIfVisible(): Promise<boolean> {
    return this.clickIfVisibleByAnyText([
      '使用应用时允许', '仅在使用中允许', '仅使用期间允许', '允许', '同意', 'Allow', 'While using the app', 'OK', '确定',
    ], 200)
  }

  static async confirmPickerSelectionByCoordinates(): Promise<void> {
    // Android Photo Picker 多选模式通常右下角是“添加/完成”；部分 ROM 放在右上角。
    // 两个位置都点一下，若已经返回 WebView，后续点击不会造成影响。
    await this.tapByRatio(0.88, 0.94)
    await browser.pause(500)
    if (await this.isNativePickerStillOpen()) {
      await this.tapByRatio(0.88, 0.07)
      await browser.pause(500)
    }
  }

  static async selectPreparedAlbumImage(): Promise<void> {
    await WebViewContext.switchToNative()
    const deadline = Date.now() + 25000

    // 这里故意不再用 getPageSource/findElement 找缩略图。
    // 在你的 vivo / Android 16 Photo Picker 上，UiAutomator2 查询 native hierarchy 会 10s 超时，
    // 但原生选择器已经打开了。对该专项来说，点击第一张可见图片即可验证 file chooser bridge。
    const candidatePoints = [
      [0.18, 0.24], [0.50, 0.24], [0.82, 0.24],
      [0.18, 0.30], [0.50, 0.30], [0.82, 0.30],
      [0.18, 0.42], [0.50, 0.42], [0.82, 0.42],
      [0.18, 0.55], [0.50, 0.55], [0.82, 0.55],
      [0.18, 0.68], [0.50, 0.68], [0.82, 0.68],
    ] as const

    for (const [x, y] of candidatePoints) {
      if (Date.now() > deadline) break
      if (!(await this.isNativePickerStillOpen())) return
      await this.tapByRatio(x, y)
      await browser.pause(600)
      await this.confirmPickerSelectionByCoordinates()
      await browser.pause(800)
      if (!(await this.isNativePickerStillOpen())) return
    }

    const snapshot = await this.getNativeSnapshot({ includeSource: false })
    await this.shell('input', ['keyevent', 'BACK'], { allowFail: true, timeout: 3000 })
    throw new Error(`原生相册/文件选择器已打开，但自动点击第一张图片后仍未返回 WebView。可能是设备相册为空、测试图片未被媒体库扫描，或该 ROM 的确认按钮位置需要适配。currentPackage=${snapshot.currentPackage}; picker=${this.looksLikeSystemPicker(snapshot.dump)}`)
  }

  static async takePhotoIfCameraOpened(): Promise<void> {
    await WebViewContext.switchToNative()
    const shutterSelectors = [
      '//*[@resource-id="com.android.camera:id/shutter_button"]',
      '//*[@resource-id="com.google.android.GoogleCamera:id/shutter_button"]',
      '//*[contains(@content-desc,"拍照") or contains(@content-desc,"快门") or contains(@content-desc,"Shutter") or contains(@text,"拍照")]',
      '(//android.widget.ImageButton[@clickable="true"])[last()]',
      '(//android.widget.Button[@clickable="true"])[last()]',
    ]

    let clicked = false
    for (const selector of shutterSelectors) {
      const el = $(selector)
      if (await el.isDisplayed().catch(() => false)) {
        await el.click()
        clicked = true
        break
      }
    }

    if (!clicked) {
      // 同样给相机留一个坐标兜底：多数相机快门在底部中央。
      await this.tapByRatio(0.50, 0.86)
      await browser.pause(800)
      clicked = !(await this.isCameraStillOpen()) || true
    }

    await browser.pause(1200)
    await this.clickIfVisibleByAnyText(['使用照片', '完成', '确定', '保存', '勾选', 'Use photo', 'OK', 'Done', 'Save'], 300)
      .catch(() => false)
    if (await this.isCameraStillOpen()) {
      await this.tapByRatio(0.82, 0.92)
      await browser.pause(500)
    }
  }

  static async expectWebViewText(text: string, timeout = 8000): Promise<void> {
    await WebViewContext.switchToWebView()
    await browser.waitUntil(async () => {
      const body = await H5Runtime.getBodyText().catch(() => '')
      return body.includes(text)
    }, { timeout, interval: 300, timeoutMsg: `WebView 未出现文本：${text}` })
  }

  static assertPermissionDeclared(result: ShellResult, permission: string): void {
    assert.ok(
      result.ok || !/not requested|Unknown permission|not a changeable permission|Operation not allowed/i.test(result.output),
      `App 未声明或无法授予 ${permission}，原生录音/相机能力需要先在 AndroidManifest.xml 声明权限。pm grant 输出：${result.output}`,
    )
  }
}
