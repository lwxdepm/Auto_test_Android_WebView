import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { skipCase } from '../core/case-runner.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { MaterialsPage } from '../pages/MaterialsPage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { AuthFlow } from './auth.flow.js'
import { TestDataFlow } from './test-data.flow.js'

export class MaterialsFastFlow {
  static async open(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/materials')
    await MaterialsPage.waitForLoaded()
  }

  static async assertEntry(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await MaterialsPage.expectHasListOrEmptyState()
  }

  static async assertTabSwitch(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await MaterialsPage.selectTab('我的跟练卡')
    await MaterialsPage.expectTabSelected('我的跟练卡')
    await MaterialsPage.expectHasListOrEmptyState()
    await MaterialsPage.selectTab('我的沟通卡')
    await MaterialsPage.expectTabSelected('我的沟通卡')
  }

  static async assertCommunicationEmptyOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    const emptyAccount = TestDataFlow.resolveMaterialsEmptyAccount()
    if (emptyAccount) {
      await TestDataFlow.ensureCompletedProfile(emptyAccount)
      account = emptyAccount
    }
    await this.open(account)
    await MaterialsPage.expectHasListOrEmptyState()
    const body = await H5Runtime.getBodyText()
    if (!body.includes('暂无已保存的沟通卡')) {
      skipCase('当前账号已有沟通卡，不适合验证沟通卡空状态')
    }
  }

  static async assertPracticeEmptyOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    const emptyAccount = TestDataFlow.resolveMaterialsEmptyAccount()
    if (emptyAccount) {
      await TestDataFlow.ensureCompletedProfile(emptyAccount)
      account = emptyAccount
    }
    await this.open(account)
    await MaterialsPage.selectTab('我的跟练卡')
    await MaterialsPage.expectHasListOrEmptyState()
    const body = await H5Runtime.getBodyText()
    if (!body.includes('暂无已保存的跟练卡')) {
      skipCase('当前账号已有跟练卡，不适合验证跟练卡空状态')
    }
  }

  static async assertBackToChat(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await MaterialsPage.backToChat()
    await ChatPage.waitForLoaded()
  }

  static async assertBackToSidebar(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/materials?returnToSettings=1')
    await MaterialsPage.waitForLoaded()
    await MaterialsPage.backToChat()
    await ChatPage.waitForLoaded()
    await SideDrawerPage.waitForOpened()
  }

  static async openFirstCommunicationCardOrSkip(account: TestAccount = accounts.normal): Promise<void> {
    account = TestDataFlow.resolveMaterialsCardAccount(account)
    await TestDataFlow.ensureCommunicationCard(account)
    await this.open(account)
    if (!(await MaterialsPage.hasCommunicationCards())) {
      skipCase('当前账号没有预置沟通卡，跳过沟通卡详情类用例')
    }
    await MaterialsPage.openFirstCommunicationCard()
  }

  static async assertCommunicationList(account: TestAccount = accounts.normal): Promise<void> {
    account = TestDataFlow.resolveMaterialsCardAccount(account)
    await TestDataFlow.ensureCommunicationCard(account)
    await this.open(account)
    if (!(await MaterialsPage.hasCommunicationCards())) {
      skipCase('当前账号没有预置沟通卡，跳过沟通卡列表展示用例')
    }
  }

  static async assertCommunicationDetail(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFirstCommunicationCardOrSkip(account)
  }

  static async assertCommunicationBackToList(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFirstCommunicationCardOrSkip(account)
    await MaterialsPage.backToList()
  }

  static async assertCommunicationEditAndCancel(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFirstCommunicationCardOrSkip(account)
    await MaterialsPage.startEditCommunicationCard()
    await MaterialsPage.cancelEditCommunicationCard()
    await MaterialsPage.backToList()
  }

  static async assertCommunicationSaveModification(account: TestAccount = accounts.normal): Promise<void> {
    await this.openFirstCommunicationCardOrSkip(account)
    const marker = `自动化沟通卡保存${Date.now().toString().slice(-6)}`
    await MaterialsPage.saveCommunicationCardModification(marker)
    await MaterialsPage.backToList()
  }

  static async assertPracticeList(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await MaterialsPage.selectTab('我的跟练卡')
    if (!(await MaterialsPage.hasPracticeCards())) {
      skipCase('当前账号没有预置跟练卡，跳过跟练卡列表展示用例')
    }
  }

  static async assertPracticeDetail(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await MaterialsPage.selectTab('我的跟练卡')
    if (!(await MaterialsPage.hasPracticeCards())) {
      skipCase('当前账号没有预置跟练卡，跳过跟练卡详情用例')
    }
    await MaterialsPage.openFirstPracticeCard()
  }
}
