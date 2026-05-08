import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { env } from '../config/env.js'
import { AuthFlow } from './auth.flow.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { WebViewContext } from '../core/webview-context.js'
import { ChatPage } from '../pages/ChatPage.js'
import { InputBarPage } from '../pages/InputBarPage.js'
import { MedicalRecordsPage } from '../pages/MedicalRecordsPage.js'
import { NativeBridgePage } from '../pages/NativeBridgePage.js'

const RECORD_AUDIO = 'android.permission.RECORD_AUDIO'
const CAMERA = 'android.permission.CAMERA'

export class BridgeNativeFlow {
  static async openFreshChat(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/chat')
    await ChatPage.waitForLoaded()
    await ChatPage.startNewChat().catch(async () => {
      await ChatPage.waitForLoaded()
    })
  }

  /**
   * 真正点击 H5 file input 入口，要求 Android 原生文件/相册选择器打开并返回文件。
   * 这个用例不能用 JS 注入 File，否则只能覆盖 H5 逻辑，测不到 WebChromeClient/onShowFileChooser bridge。
   */
  static async assertNativeAlbumFileChooser(account: TestAccount = accounts.normal): Promise<void> {
    await NativeBridgePage.pushAlbumFixture()
    await this.openFreshChat(account)
    await InputBarPage.expectDefaultState()
    await InputBarPage.clickNativeUploadButton()
    await NativeBridgePage.expectNativeChooserOpened('点击聊天上传图片')
    await NativeBridgePage.selectPreparedAlbumImage()
    await WebViewContext.switchToWebView()
    await InputBarPage.expectImagePreview()
  }

  /**
   * 验证麦克风权限拒绝路径：系统权限拒绝或 WebView getUserMedia 拒绝后，H5 必须恢复并给出提示。
   */
  static async assertMicrophonePermissionDenied(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFreshChat(account)
    await NativeBridgePage.revokePermission(RECORD_AUDIO)
    await WebViewContext.switchToWebView()
    await InputBarPage.expectDefaultState()
    await InputBarPage.clickVoiceButton()

    // 部分 ROM 会弹系统权限框；部分 WebView 会直接以 NotAllowedError 回调给 H5。
    await NativeBridgePage.denyPermissionIfVisible().catch(() => false)
    await WebViewContext.switchToWebView()
    await InputBarPage.expectVoiceErrorContains(['请允许麦克风访问权限', '麦克风', '无法启动录音'])

    const state = await InputBarPage.getVoiceState()
    assert.equal(state.hasStopRecordingButton, false, `权限拒绝后不应停留在录音态：${JSON.stringify(state)}`)
    await NativeBridgePage.resetPermissionAppOp(RECORD_AUDIO)
  }

  /**
   * 验证授权后可进入录音态并可停止。第一版只断言 UI 状态，不强依赖 ASR 真正识别出文本。
   */
  static async assertMicrophoneStartStop(account: TestAccount = accounts.normal): Promise<void> {
    const grant = await NativeBridgePage.grantPermission(RECORD_AUDIO)
    NativeBridgePage.assertPermissionDeclared(grant, RECORD_AUDIO)

    await this.openFreshChat(account)
    await WebViewContext.switchToWebView()
    await InputBarPage.expectDefaultState()
    await InputBarPage.clickVoiceButton()
    await NativeBridgePage.allowPermissionIfVisible().catch(() => false)
    await WebViewContext.switchToWebView()
    await InputBarPage.expectRecordingStarted()
    await browser.pause(800)
    await InputBarPage.stopRecording()
    await InputBarPage.expectRecordingStopped()
  }

  /**
   * 验证 capture=environment 场景是否能进入原生相机，拍照后回填到 OCR 上传预览。
   */
  static async assertNativeCameraCapture(account: TestAccount = accounts.normal): Promise<void> {
    const grant = await NativeBridgePage.grantPermission(CAMERA)
    NativeBridgePage.assertPermissionDeclared(grant, CAMERA)

    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/medical-records')
    const state = await MedicalRecordsPage.waitForConsentOrLoaded()
    if (state === 'consent') await MedicalRecordsPage.acceptHealthConsent()
    await MedicalRecordsPage.openUploadPage()
    await MedicalRecordsPage.expectUploadElements()
    await MedicalRecordsPage.clickNativeCameraButton()
    await NativeBridgePage.expectNativeChooserOpened('点击 OCR 拍照')
    await NativeBridgePage.allowPermissionIfVisible().catch(() => false)
    await NativeBridgePage.takePhotoIfCameraOpened()
    await WebViewContext.switchToWebView()
    await MedicalRecordsPage.expectUploadPreviewCount(1)
  }

  /**
   * 不 stub clipboard，真实点击复制后继续聚焦输入框，验证 WebView selection/clipboard 遗留不会拦截后续输入。
   */
  static async assertCopyThenInputStillInteractive(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFreshChat(account)
    const text = `Appium复制后输入${Date.now().toString().slice(-6)}`
    await InputBarPage.sendText(`${text}，请用一句话回复。`)
    await ChatPage.expectUserMessage(text)
    await ChatPage.waitForAssistantFinal(60000)
    await ChatPage.clickAssistantCopyAndExpectSuccess({ stubClipboard: false })

    const inputText = `复制后继续输入${Date.now().toString().slice(-6)}`
    await ChatPage.focusInput()
    await ChatPage.inputMessage(inputText)
    const value = await H5Runtime.execute(() => {
      const textarea = document.querySelector('textarea[placeholder="输入您的问题..."]') as HTMLTextAreaElement | null
      return textarea?.value ?? ''
    })
    assert.equal(value, inputText, `复制/selection 后输入框不可正常输入，实际=${value}`)
  }

  static async assertAndroidShellLooksBridgeReady(): Promise<void> {
    // 快速诊断：当前 App 是否至少声明了专项能力常用权限。不是独立用例，只供失败信息定位。
    if (!env.androidAppPackage) throw new Error('ANDROID_APP_PACKAGE 未配置')
    await WebViewContext.switchToNative().catch(() => undefined)
    const dump = await NativeBridgePage.shell('dumpsys', ['package', env.androidAppPackage], { allowFail: true, timeout: 15000 })
    assert.ok(dump.output.includes('android.permission.INTERNET'), 'App package 信息异常，未看到 INTERNET 权限')
  }
}
