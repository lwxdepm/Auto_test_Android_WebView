import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { AccountSecurityPage } from '../pages/AccountSecurityPage.js'
import { ProfilePage } from '../pages/ProfilePage.js'
import { AuthFlow } from './auth.flow.js'

export class AccountSecurityFlow {
  static async open(account: TestAccount = accounts.normal): Promise<void> {
    await AuthFlow.ensureLoggedIn(account)
    await H5Runtime.goto('/account-security')
    await AccountSecurityPage.waitForLoaded()
  }

  static async assertEntry(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
  }

  static async assertBackToProfile(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.backToProfile()
    await ProfilePage.waitForLoaded()
  }

  static async assertOpenAndCancelClearDialog(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.openClearDialog()
    await AccountSecurityPage.cancelClearDialog()
  }

  static async assertOpenAndCancelDeleteDialog(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.openDeleteDialog()
    await AccountSecurityPage.cancelDeleteDialog()
  }

  static async assertDeletionCountdown(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.expectDeletionCountdown()
    await AccountSecurityPage.cancelDeleteDialog()
  }

  static async assertDeletionPhraseValidation(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.expectDeletionPhraseValidation()
    await AccountSecurityPage.cancelDeleteDialog()
  }

  static async assertClearMedicalCodeCountdown(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.expectClearMedicalCountdown()
    await AccountSecurityPage.cancelClearDialog()
  }

  static async assertClearMedicalEmptyCodeBlocked(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.expectClearMedicalEmptyCodeBlocked()
    await AccountSecurityPage.cancelClearDialog()
  }

  static async assertClearMedicalWrongCode(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.expectClearMedicalWrongCode()
    await AccountSecurityPage.cancelClearDialog()
  }

  static async assertDeletionSmsCountdown(account: TestAccount = accounts.normal): Promise<void> {
    await this.open(account)
    await AccountSecurityPage.expectDeletionSmsCountdown()
    await AccountSecurityPage.cancelDeleteDialog()
  }
}
