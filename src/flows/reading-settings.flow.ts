import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { ReadingSettingsPage } from '../pages/ReadingSettingsPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { AuthFlow } from './auth.flow.js'

export class ReadingSettingsFlow {
  static async open(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/reading-settings')
    await ReadingSettingsPage.waitForLoaded()
  }

  static async assertEntry(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await ReadingSettingsPage.expectSelected('medium').catch(() => undefined)
    await ReadingSettingsPage.option('small').waitForDisplayed({ timeout: 10000 })
    await ReadingSettingsPage.option('medium').waitForDisplayed({ timeout: 10000 })
    await ReadingSettingsPage.option('large').waitForDisplayed({ timeout: 10000 })
  }

  static async assertThreeScaleSwitch(): Promise<void> {
    await ReadingSettingsPage.select('small')
    await ReadingSettingsPage.expectSelected('small')
    await ReadingSettingsPage.select('medium')
    await ReadingSettingsPage.expectSelected('medium')
    await ReadingSettingsPage.select('large')
    await ReadingSettingsPage.expectSelected('large')
  }

  static async assertPersistence(): Promise<void> {
    await ReadingSettingsPage.select('large')
    await ReadingSettingsPage.expectPersisted('large')
    await H5Runtime.reload()
    await ReadingSettingsPage.waitForLoaded()
    await ReadingSettingsPage.expectSelected('large')
    await ReadingSettingsPage.select('medium')
    await ReadingSettingsPage.expectPersisted('medium')
  }

  static async assertBackToSidebar(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/reading-settings?returnToSettings=1')
    await ReadingSettingsPage.waitForLoaded()
    await ReadingSettingsPage.back()
    await ChatPage.waitForLoaded()
    await SideDrawerPage.waitForOpened()
  }

  static async assertFontAffectsChatAndMaterials(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await ReadingSettingsPage.select('large')
    const settingsSize = await H5Runtime.execute(() => getComputedStyle(document.documentElement).getPropertyValue('--font-size-chat').trim())
    await H5Runtime.goto('/chat')
    await ChatPage.waitForLoaded()
    const chatSize = await H5Runtime.execute(() => getComputedStyle(document.documentElement).getPropertyValue('--font-size-chat').trim())
    await H5Runtime.goto('/materials')
    const materialsSize = await H5Runtime.execute(() => getComputedStyle(document.documentElement).getPropertyValue('--font-size-chat').trim())
    if (!settingsSize || settingsSize !== chatSize || settingsSize !== materialsSize) {
      throw new Error(`字号 CSS 变量未在页面间保持一致：settings=${settingsSize}, chat=${chatSize}, materials=${materialsSize}`)
    }
    await H5Runtime.goto('/reading-settings')
    await ReadingSettingsPage.waitForLoaded()
    await ReadingSettingsPage.select('medium')
  }
}
