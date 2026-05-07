import { itCase } from '../core/case-runner.js'
import { WebViewContext } from '../core/webview-context.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { AppController } from '../core/app-controller.js'
import { env } from '../config/env.js'

before(async () => {
  if (env.clearAppBeforeSuite) {
    await AppController.clearAppData().catch(() => undefined)
    await AppController.launch().catch(() => undefined)
  }
})

describe('WebView 启动与 Context', () => {
  itCase('CX-WV-BASE-001', 'App 启动 WebView，可获取 URL 和页面文本', { tags: ['smoke', 'webview', 'p0'] }, async () => {
    await WebViewContext.switchToWebView()
    await H5Runtime.expectNotBlank()
    const url = await H5Runtime.getCurrentUrl()
    if (!/^https?:\/\//.test(url) && !url.startsWith('file:')) {
      throw new Error(`WebView URL 异常：${url}`)
    }
  })
})
