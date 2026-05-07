import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import { accounts } from '../config/accounts.js'
import type { TestAccount } from '../config/accounts.js'
import { AppController } from '../core/app-controller.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { WebViewContext } from '../core/webview-context.js'
import { ChatPage } from '../pages/ChatPage.js'
import { LoginPage } from '../pages/LoginPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { AuthFlow } from './auth.flow.js'

export class LogoutFlow {
  static async logoutFromDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await ChatPage.openDrawer()
    await SideDrawerPage.logout()
    await WebViewContext.switchToWebView().catch(() => undefined)
    await LoginPage.waitForLoaded()
    await H5Runtime.expectLocalStorageMissing('cx-token')
  }

  static async logoutThenBackShouldNotReturn(account: TestAccount = accounts.normal): Promise<void> {
    await this.logoutFromDrawer(account)
    await AppController.pressBack()
    await browser.pause(1000)
    await WebViewContext.switchToWebView().catch(() => undefined)
    const token = await H5Runtime.getLocalStorage('cx-token').catch(() => null)
    assert.equal(token, null, '登出后返回不应恢复 cx-token')
    const path = await H5Runtime.getPathname().catch(() => '')
    assert.ok(!path.startsWith('/chat'), `登出后系统返回不应回到已登录页面，实际 path=${path}`)
  }
}
