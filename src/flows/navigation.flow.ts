import assert from 'node:assert/strict'
import { $, browser } from '@wdio/globals'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { H5ApiClient } from '../core/h5-api-client.js'
import { AppController } from '../core/app-controller.js'
import { ChatPage } from '../pages/ChatPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { ProfilePage } from '../pages/ProfilePage.js'
import { ReadingSettingsPage } from '../pages/ReadingSettingsPage.js'
import { MaterialsPage } from '../pages/MaterialsPage.js'
import { MedicalRecordsPage } from '../pages/MedicalRecordsPage.js'
import { LoginPage } from '../pages/LoginPage.js'
import { AuthFlow } from './auth.flow.js'

interface CreatedSession {
  id: string
  title: string | null
}

export class NavigationFlow {
  static async openDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await ChatPage.openDrawer()
    await SideDrawerPage.waitForOpened()
  }

  static async closeDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    await SideDrawerPage.close()
    await ChatPage.expectDrawerClosed()
  }

  static async goProfileFromDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    await SideDrawerPage.openItem('个人信息')
    await ProfilePage.waitForLoaded()
    const path = await H5Runtime.getPathname()
    assert.equal(path, '/profile', `期望进入 /profile，实际=${path}`)
  }

  static async goReadingSettingsFromDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    await SideDrawerPage.openItem('阅读设置')
    await ReadingSettingsPage.waitForLoaded()
  }

  static async goMaterialsFromDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    await SideDrawerPage.openItem('我的材料')
    await MaterialsPage.waitForLoaded()
  }

  static async goMedicalRecordsFromDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    await SideDrawerPage.openItem('健康档案')
    if (await MedicalRecordsPage.hasHealthConsentDialog()) {
      await MedicalRecordsPage.acceptHealthConsent()
    }
    await MedicalRecordsPage.waitForLoaded()
  }

  static async newChatFromDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    await $('button[title="新对话"]').click()
    await ChatPage.expectWelcome()
  }

  static async showHistoryListOrEmpty(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    const body = await H5Runtime.getBodyText()
    assert.ok(body.includes('对话记录'), '侧边栏应展示对话记录区域')
    assert.ok(body.includes('暂无对话记录') || body.includes('条消息') || body.includes('加载中'), '历史列表应展示空态、加载态或会话列表')
    await SideDrawerPage.close().catch(() => undefined)
  }

  static async assertHistoryLoadMore(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    const suffix = Date.now().toString().slice(-6)
    const created: CreatedSession[] = []
    const oldestTitle = `Appium历史加载更多-${suffix}-00`
    try {
      for (let i = 0; i < 35; i++) {
        const title = `Appium历史加载更多-${suffix}-${String(i).padStart(2, '0')}`
        created.push(await H5ApiClient.post<CreatedSession>('/sessions', { title }))
      }
      await ChatPage.openDrawer()
      await SideDrawerPage.waitForOpened()
      let body = await H5Runtime.getBodyText()
      if (!body.includes(oldestTitle)) {
        await SideDrawerPage.scrollHistoryToBottom()
        await SideDrawerPage.waitForHistoryFooterOrTitle(oldestTitle)
      }
      body = await H5Runtime.getBodyText()
      assert.ok(body.includes(oldestTitle), `滚动到底后未加载更早历史会话：${oldestTitle}`)
    } finally {
      for (const session of created) {
        if (session.id) await H5ApiClient.delete(`/sessions/${session.id}`).catch(() => undefined)
      }
      await SideDrawerPage.close().catch(() => undefined)
    }
  }

  static async assertMaterialsAdminVisibility(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    const result = await H5Runtime.execute(() => {
      const hostname = window.location.hostname.toLowerCase()
      const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
      const privateIpv4 = !!ipv4 && (() => {
        const parts = ipv4.slice(1).map(Number)
        return parts[0] === 10
          || parts[0] === 127
          || (parts[0] === 192 && parts[1] === 168)
          || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      })()
      const shouldShow = hostname === 'dev-cx.senzco.com' || hostname === 'localhost' || hostname === '127.0.0.1' || privateIpv4
      return {
        hostname,
        shouldShow,
        visible: (document.body?.innerText || '').includes('素材上传台'),
      }
    })
    assert.equal(result.visible, result.shouldShow, `素材上传台入口可见性异常：${JSON.stringify(result)}`)
    await SideDrawerPage.close().catch(() => undefined)
  }

  static async profileReturnToSidebar(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/profile?mode=edit&returnToSettings=1')
    await ProfilePage.waitForLoaded()
    await ProfilePage.backToChat()
    await ChatPage.waitForLoaded()
    await SideDrawerPage.waitForOpened()
  }

  static async logoutFromDrawer(account: TestAccount = accounts.normal): Promise<void> {
    await this.openDrawer(account)
    await SideDrawerPage.logout()
    await LoginPage.waitForLoaded()
    await H5Runtime.expectLocalStorageMissing('cx-token')
  }

  static async systemBackFromReadingSettings(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/reading-settings')
    await ReadingSettingsPage.waitForLoaded()
    await AppController.pressBack()
    await browser.waitUntil(async () => (await H5Runtime.getPathname().catch(() => '')) === '/chat', {
      timeout: 10000,
      interval: 300,
      timeoutMsg: '系统返回后未回到 /chat',
    })
    await ChatPage.waitForLoaded()
    await H5Runtime.expectNotBlank()
  }
}
