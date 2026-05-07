import { itCase } from '../core/case-runner.js'
import { RouteFlow } from '../flows/route.flow.js'

describe('WebView 深链未登录重定向', () => {
  itCase('CX-WV-BASE-020', '未登录访问业务深链统一重定向登录页', { tags: ['smoke', 'deeplink', 'p0'] }, async () => {
    for (const path of [
      '/chat/appium-fake-session-id',
      '/medical-records',
      '/materials',
      '/profile',
      '/account-security',
      '/reading-settings',
    ]) {
      await RouteFlow.assertUnauthRedirect(path)
    }
  })
})
