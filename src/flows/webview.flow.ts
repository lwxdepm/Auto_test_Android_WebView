import { browser } from '@wdio/globals'
import { WebViewContext } from '../core/webview-context.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { AuthFlow } from './auth.flow.js'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { AppController } from '../core/app-controller.js'
import { env } from '../config/env.js'
import { skipCase } from '../core/case-runner.js'

export class WebViewFlow {
  static async assertStartupNotBlank(): Promise<void> {
    await WebViewContext.switchToWebView()
    await H5Runtime.expectNotBlank()
  }

  static async assertKeyboardDoesNotCoverInput(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await ChatPage.expectInputVisibleAboveKeyboard()
  }

  static async assertDeepLinkRefreshWorks(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/chat')
    await ChatPage.waitForLoaded()
    await H5Runtime.reload()
    await WebViewContext.switchToWebView()
    await ChatPage.waitForLoaded()
    await H5Runtime.expectNotBlank()
    await browser.pause(300)
  }

  static async assertRestartKeepsLogin(account: TestAccount = accounts.normal): Promise<void> {
    if (!env.restartAppCaseEnabled) {
      skipCase('RESTART_APP_CASE_ENABLED=false：Appium 会话内重启 App 对 WebView/Chromedriver 较敏感，默认跳过 CX-WV-BASE-012；需要专项验证时在 .env 开启。')
    }
    await AuthFlow.ensureLoggedIn(account)
    await AppController.restart()
    await H5Runtime.goto('/chat').catch(() => undefined)
    await ChatPage.waitForLoaded()
    await H5Runtime.expectNotBlank()
  }
}
