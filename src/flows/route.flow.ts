import { browser } from '@wdio/globals'
import { H5Runtime } from '../core/h5-runtime.js'
import { WebViewContext } from '../core/webview-context.js'
import { LoginPage } from '../pages/LoginPage.js'

export class RouteFlow {
  static async assertUnauthRedirect(path: string): Promise<void> {
    await WebViewContext.switchToWebView()
    await H5Runtime.clearLoginStorage()
    await H5Runtime.goto(path)
    await browser.waitUntil(async () => {
      const pathname = await H5Runtime.getPathname().catch(() => '')
      return pathname === '/login'
    }, {
      timeout: 15000,
      interval: 300,
      timeoutMsg: `未登录访问 ${path} 未重定向到 /login，当前=${await H5Runtime.getCurrentUrl().catch(() => '')}`,
    })
    await LoginPage.waitForLoaded()
    await H5Runtime.expectNotBlank()
  }
}
