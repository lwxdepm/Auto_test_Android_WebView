import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { WebViewFlow } from '../flows/webview.flow.js'

const account = accounts.normal

describe('WebView 容器 fast 兼容验证', () => {
  itCase('CX-WV-COMPAT-001', '首屏高度与白屏兜底', { tags: ['smoke', 'webview', 'p0'] }, async () => {
    await WebViewFlow.assertStartupNotBlank()
  })

  itCase('CX-WV-COMPAT-002', '软键盘不遮挡 Chat 输入框', { tags: ['smoke', 'webview', 'p0'] }, async () => {
    await WebViewFlow.assertKeyboardDoesNotCoverInput(account)
  })

  itCase('CX-WV-COMPAT-004', '登录态下深链刷新/重进无白屏', { tags: ['smoke', 'webview', 'p0'] }, async () => {
    await WebViewFlow.assertDeepLinkRefreshWorks(account)
  })

  itCase('CX-WV-BASE-012', '关闭重启 App 后未清数据时保持登录态', { tags: ['webview', 'auth-state', 'p1'] }, async () => {
    await WebViewFlow.assertRestartKeepsLogin(account)
  })
})
