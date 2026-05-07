import assert from 'node:assert/strict'
import { browser } from '@wdio/globals'
import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { allocateNextNeedsProfilePhone, env } from '../config/env.js'
import { skipCase } from '../core/case-runner.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { MedicalRecordsPage } from '../pages/MedicalRecordsPage.js'
import { ProfilePage } from '../pages/ProfilePage.js'
import { SideDrawerPage } from '../pages/SideDrawerPage.js'
import { AuthFlow } from './auth.flow.js'
import { MedicalFastFlow } from './medical-fast.flow.js'
import { TestDataFlow } from './test-data.flow.js'

export class ProfileFastFlow {
  static resolveRequiredProfileAccount(account: TestAccount = accounts.needsProfile): TestAccount {
    const phone = env.testPhoneNeedsProfileAutoIncrement
      ? allocateNextNeedsProfilePhone()
      : account.phone
    return { ...account, phone }
  }

  static async openEdit(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/profile?mode=edit')
    await ProfilePage.waitForLoaded()
  }

  static async openOptional(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.setLocalStorage('cx-needs-profile', 'false')
    await H5Runtime.setLocalStorage('cx-require-complete-profile', 'false')
    await H5Runtime.goto('/profile')
    await ProfilePage.waitForLoaded()
  }

  static async openRequiredProfile(account: TestAccount = accounts.needsProfile): Promise<void> {
    const actualAccount = this.resolveRequiredProfileAccount(account)
    if (!actualAccount.phone) {
      skipCase('未配置 TEST_PHONE_NEEDS_PROFILE，跳过需要“未完善资料新账号”的 Profile 用例')
    }
    const path = await AuthFlow.loginWithFixedCode(actualAccount, { allowProfile: true })
    if (path !== '/profile') {
      throw new Error(`需要未完善资料账号，登录后应进入 /profile，实际=${path}。请检查 TEST_PHONE_NEEDS_PROFILE 是否为新账号/needsProfile=true 账号。`)
    }
    await ProfilePage.waitForLoaded()
  }

  static async restoreProfileFlags(): Promise<void> {
    await H5Runtime.setLocalStorage('cx-needs-profile', 'false').catch(() => undefined)
    await H5Runtime.setLocalStorage('cx-require-complete-profile', 'false').catch(() => undefined)
    await H5Runtime.replace('/chat').catch(() => undefined)
    await H5Runtime.reload().catch(() => undefined)
    await ChatPage.waitForLoaded().catch(() => undefined)
  }

  static async cleanupRequiredProfileSession(): Promise<void> {
    await H5Runtime.clearLoginStorage().catch(() => undefined)
    await H5Runtime.goto('/login').catch(() => undefined)
  }

  static async assertElements(account: TestAccount = accounts.normal): Promise<void> {
    await this.openEdit(account)
    await ProfilePage.expectElements()
  }

  static async assertFirstLoginRedirect(account: TestAccount = accounts.needsProfile): Promise<void> {
    await this.openRequiredProfile(account)
    try {
      const path = await H5Runtime.getPathname()
      assert.equal(path, '/profile', `首次未完善资料账号登录后应进入 /profile，实际=${path}`)
    } finally {
      await this.cleanupRequiredProfileSession()
    }
  }

  static async assertNicknameInput(account: TestAccount = accounts.normal): Promise<void> {
    await this.openEdit(account)
    await ProfilePage.inputNickname(`自动化测试${Date.now().toString().slice(-6)}`)
  }

  static async assertBirthdayPicker(account: TestAccount = accounts.normal): Promise<void> {
    await this.openEdit(account)
    await ProfilePage.openBirthdayPickerAndConfirm()
  }

  static async assertConcernSelect(account: TestAccount = accounts.normal): Promise<void> {
    await this.openEdit(account)
    await ProfilePage.selectFirstConcern()
  }

  static async assertGenderSelect(account: TestAccount = accounts.normal): Promise<void> {
    await this.openEdit(account)
    await ProfilePage.selectGender('女性')
    await ProfilePage.selectGender('男性')
  }

  static async assertOptionalCanSkip(account: TestAccount = accounts.normal): Promise<void> {
    await this.openOptional(account)
    await ProfilePage.expectSkipVisible(true)
  }

  static async assertSkipToChat(account: TestAccount = accounts.normal): Promise<void> {
    await this.openOptional(account)
    await ProfilePage.skip()
    await ChatPage.waitForLoaded()
  }

  static async assertEditBack(account: TestAccount = accounts.normal): Promise<void> {
    await this.openEdit(account)
    await ProfilePage.backToChat()
    await ChatPage.waitForLoaded()
  }

  static async assertCompleteRequiredProfileSave(account: TestAccount = accounts.needsProfile): Promise<void> {
    await this.openRequiredProfile(account)
    try {
      await ProfilePage.fillRequiredProfile(`自动化完整资料${Date.now().toString().slice(-6)}`)
      await ProfilePage.save()
      await ChatPage.waitForLoaded()
      const path = await H5Runtime.getPathname()
      assert.ok(path === '/chat' || path.startsWith('/chat/'), `完整保存后应进入 /chat，实际=${path}`)
    } finally {
      await this.cleanupRequiredProfileSession()
    }
  }

  static async assertEditSave(account: TestAccount = accounts.normal): Promise<void> {
    await this.openEdit(account)
    const marker = `自动化编辑${Date.now().toString().slice(-6)}`
    await ProfilePage.inputNickname(marker)
    await ProfilePage.save()
    await ChatPage.waitForLoaded()
  }

  static async assertConcernChangeAffectsMedicalFields(account: TestAccount = accounts.normal): Promise<void> {
    try {
      await TestDataFlow.setCompletedProfile(account, {
        gender: '女',
        currentConcern: 'breast_tumor_care',
      })
      await this.openEdit(account)
      await ProfilePage.selectConcernByText('结节随访')
      await ProfilePage.save()
      await ChatPage.waitForLoaded()

      await MedicalFastFlow.ensureMedicalPageReady(account)
      await MedicalRecordsPage.openMedicalProfileEdit()
      await MedicalRecordsPage.expectEditableFieldVisible('用药情况', true)
      await MedicalRecordsPage.expectEditableFieldVisible('月经状态', true)
      for (const label of ['肿瘤分型', '确诊时长', '治疗阶段']) {
        await MedicalRecordsPage.expectEditableFieldVisible(label, false)
      }
      await MedicalRecordsPage.cancelMedicalProfileEdit()
    } finally {
      await TestDataFlow.setCompletedProfile(account, {
        gender: '女',
        currentConcern: 'breast_tumor_care',
      }).catch(() => undefined)
    }
  }

  static async assertRequiredCannotSkip(account: TestAccount = accounts.needsProfile): Promise<void> {
    await this.openRequiredProfile(account)
    try {
      await ProfilePage.expectSkipVisible(false)
    } finally {
      await this.cleanupRequiredProfileSession()
    }
  }

  static async assertRequiredPartialSaveBlocked(account: TestAccount = accounts.needsProfile): Promise<void> {
    await this.openRequiredProfile(account)
    try {
      await ProfilePage.clearNickname()
      await ProfilePage.save()
      await ProfilePage.expectErrorContains('昵称')
      const path = await H5Runtime.getPathname()
      assert.equal(path, '/profile')
      await browser.pause(100)
    } finally {
      await this.cleanupRequiredProfileSession()
    }
  }

  static async assertRequiredEmptyValidation(account: TestAccount = accounts.needsProfile): Promise<void> {
    await this.assertRequiredPartialSaveBlocked(account)
  }

  static async assertReturnSessionBackToSidebar(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    const fakeSessionId = 'appium-return-session'
    await H5Runtime.goto(`/profile?mode=edit&returnSessionId=${fakeSessionId}&returnToSettings=1`)
    await ProfilePage.waitForLoaded()
    await ProfilePage.backToChat()
    await browser.waitUntil(async () => {
      const path = await H5Runtime.getPathname().catch(() => '')
      return path === `/chat/${fakeSessionId}`
    }, { timeout: 10000, interval: 300, timeoutMsg: '个人信息返回后未回到指定会话路由' })
    await ChatPage.waitForLoaded()
    await SideDrawerPage.waitForOpened()
  }
}
