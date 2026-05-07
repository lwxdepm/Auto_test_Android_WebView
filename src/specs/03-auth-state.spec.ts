import { browser } from '@wdio/globals'
import { itCase } from '../core/case-runner.js'
import { accounts } from '../config/accounts.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { LoginPage } from '../pages/LoginPage.js'
import { ChatPage } from '../pages/ChatPage.js'
import { AuthFlow } from '../flows/auth.flow.js'
import { LogoutFlow } from '../flows/logout.flow.js'
import { AccountIsolationFlow } from '../flows/account-isolation.flow.js'

const account = accounts.normal

describe('登录态与登出', () => {
  itCase('CX-WV-BASE-009', '清 App 数据后本地登录态被清理', { tags: ['auth-state', 'p0', 'destructive'] }, async () => {
    await AuthFlow.assertAppDataClearReturnsLogin(account)
  })

  itCase('CX-WV-BASE-010', '正常退出登录后返回登录页并清除 token', { tags: ['smoke', 'auth-state', 'p0'] }, async () => {
    await LogoutFlow.logoutFromDrawer(account)
  })

  itCase('CX-WV-BASE-011', '登出后系统返回不应回到已登录页面', { tags: ['smoke', 'auth-state', 'p0'] }, async () => {
    await LogoutFlow.logoutThenBackShouldNotReturn(account)
  })

  itCase('CX-WV-BASE-017', '错误 token 触发 401 后自动退出登录', { tags: ['smoke', 'auth-state', 'p0'] }, async () => {
    await AuthFlow.ensureOnLoginPage()
    await H5Runtime.setLocalStorage('cx-token', 'invalid-token-for-appium-test')
    await H5Runtime.setLocalStorage('cx-needs-profile', 'false')
    await H5Runtime.goto('/chat')
    await ChatPage.triggerAuthedRequest().catch(() => undefined)
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      return path === '/login'
    }, { timeout: 15000, interval: 500, timeoutMsg: '错误 token 后未自动跳回 /login' })
    await LoginPage.waitForLoaded()
    await H5Runtime.expectLocalStorageMissing('cx-token')
  })

  itCase('CX-WV-BASE-018', '切账号后会话与健康档案缓存隔离', { tags: ['smoke', 'auth-state', 'account-isolation', 'p0'] }, async () => {
    await AccountIsolationFlow.assertSwitchAccountCacheIsolation(accounts.normal, accounts.second)
  })
})
