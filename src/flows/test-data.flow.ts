import type { TestAccount } from '../config/accounts.js'
import { accounts } from '../config/accounts.js'
import {
  allocateNextMedicalPurgePhone,
  allocateNextMaterialsCardPhone,
  allocateNextMaterialsEmptyPhone,
  allocateNextNoHealthConsentPhone,
  env,
} from '../config/env.js'
import { H5ApiClient } from '../core/h5-api-client.js'
import { H5Runtime } from '../core/h5-runtime.js'
import { ChatPage } from '../pages/ChatPage.js'
import { AuthFlow } from './auth.flow.js'

interface CommunicationCardRecord {
  id: string
  title: string
  cardDate: string
}

type DynamicAccountKind = 'materialsEmpty' | 'materialsCard' | 'noHealthConsent' | 'medicalPurge'
type CompletedProfileOverrides = Partial<{
  nickname: string
  birthday: string
  gender: '男' | '女'
  currentConcern: 'breast_tumor_care' | 'breast_nodule_followup' | 'awaiting_exam_or_results' | 'not_sure_exploring' | 'other_breast_issue'
}>

const dynamicAccounts: Partial<Record<DynamicAccountKind, TestAccount>> = {}
const completedProfilePhones = new Set<string>()
const knownMedicalProfileStates = new Map<string, string>()
const communicationCardSeededPhones = new Set<string>()

function completeProfilePayload(
  account: TestAccount,
  overrides: CompletedProfileOverrides = {},
) {
  const suffix = account.phone.slice(-4) || Date.now().toString().slice(-4)
  return {
    nickname: `自动化测试${suffix}`,
    birthday: '1990-01-01',
    gender: '女',
    currentConcern: 'breast_tumor_care',
    ...overrides,
  }
}

function medicalProfileStateKey(overrides: CompletedProfileOverrides = {}): string {
  return `${overrides.gender ?? '女'}:${overrides.currentConcern ?? 'breast_tumor_care'}`
}

function communicationCardSeedPayload(account: TestAccount) {
  const today = new Date().toISOString().slice(0, 10)
  const suffix = account.phone.slice(-4) || Date.now().toString().slice(-4)
  const draft = {
    title: `自动化沟通卡-${suffix}`,
    cardDate: today,
    visitPurpose: '自动化快速验证：准备复诊沟通重点',
    currentSituation: '这是 Appium 自动化测试准备的沟通卡前置数据。',
    informationForDoctor: '希望医生了解近期症状、用药与检查情况。',
    questionsForDoctor: '下一步治疗建议是什么？需要补充哪些检查？',
  }
  return {
    draft,
    originalDraft: draft,
    sourceSessionId: null,
    sourceToolCallId: `appium-seed-${suffix}`,
  }
}

export class TestDataFlow {
  static resolveMaterialsEmptyAccount(): TestAccount | null {
    if (!env.useDynamicEmptyMaterialsAccount) return null
    if (!dynamicAccounts.materialsEmpty) {
      const phone = env.testPhoneMaterialsEmptyAutoIncrement
        ? allocateNextMaterialsEmptyPhone()
        : env.testPhoneMaterialsEmpty
      if (!phone) return null
      dynamicAccounts.materialsEmpty = {
        ...accounts.materialsEmpty,
        phone,
      }
    }
    return dynamicAccounts.materialsEmpty
  }

  static resolveMaterialsCardAccount(fallback: TestAccount): TestAccount {
    if (!env.seedCommunicationCardBeforeCases) return fallback
    if (!dynamicAccounts.materialsCard) {
      const phone = env.testPhoneMaterialsCardAutoIncrement
        ? allocateNextMaterialsCardPhone()
        : env.testPhoneMaterialsCard
      dynamicAccounts.materialsCard = phone
        ? {
            ...accounts.materialsCard,
            phone,
          }
        : fallback
    }
    return dynamicAccounts.materialsCard
  }

  static resolveNoHealthConsentAccount(): TestAccount | null {
    if (!env.useDynamicNoHealthConsentAccount) return null
    if (!dynamicAccounts.noHealthConsent) {
      const phone = env.testPhoneNoHealthConsentAutoIncrement
        ? allocateNextNoHealthConsentPhone()
        : env.testPhoneNoHealthConsent
      if (!phone) return null
      dynamicAccounts.noHealthConsent = {
        ...accounts.noHealthConsent,
        phone,
      }
    }
    return dynamicAccounts.noHealthConsent
  }

  static resolveMedicalPurgeAccount(): TestAccount | null {
    if (!dynamicAccounts.medicalPurge) {
      const phone = env.testPhoneMedicalPurgeAutoIncrement
        ? allocateNextMedicalPurgePhone()
        : env.testPhoneMedicalPurge
      if (!phone) return null
      dynamicAccounts.medicalPurge = {
        ...accounts.medicalPurge,
        phone,
      }
    }
    return dynamicAccounts.medicalPurge
  }

  static async setCompletedProfile(
    account: TestAccount,
    overrides: CompletedProfileOverrides = {},
  ): Promise<void> {
    if (!account.phone) {
      throw new Error(`${account.name} 未配置手机号，无法准备测试账号`)
    }

    await AuthFlow.loginWithFixedCode(account, { allowProfile: true })
    await H5ApiClient.put('/medical/profile', completeProfilePayload(account, overrides))
    await H5Runtime.setLocalStorage('cx-needs-profile', 'false')
    await H5Runtime.setLocalStorage('cx-require-complete-profile', 'false')
    await H5Runtime.replace('/chat')
    await ChatPage.waitForLoaded()

    completedProfilePhones.add(account.phone)
    knownMedicalProfileStates.set(account.phone, medicalProfileStateKey(overrides))
  }

  static async ensureCompletedProfile(account: TestAccount): Promise<void> {
    if (!account.phone) {
      throw new Error(`${account.name} 未配置手机号，无法准备测试账号`)
    }

    if (completedProfilePhones.has(account.phone)) {
      await AuthFlow.ensureLoggedIn(account)
      return
    }

    await this.setCompletedProfile(account)
  }

  static async ensureKnownMedicalProfile(account: TestAccount): Promise<void> {
    if (!env.ensureKnownMedicalProfileForFastCases) {
      await AuthFlow.ensureLoggedIn(account)
      return
    }

    if (!account.phone) {
      throw new Error(`${account.name} 未配置手机号，无法准备健康档案字段可见性`)
    }

    await AuthFlow.ensureLoggedIn(account)
    const targetState = medicalProfileStateKey()
    if (knownMedicalProfileStates.get(account.phone) === targetState) return

    await H5ApiClient.put('/medical/profile', completeProfilePayload(account))
    await H5Runtime.setLocalStorage('cx-needs-profile', 'false')
    await H5Runtime.setLocalStorage('cx-require-complete-profile', 'false')
    knownMedicalProfileStates.set(account.phone, targetState)
  }

  static async ensureCommunicationCard(account: TestAccount): Promise<void> {
    if (!env.seedCommunicationCardBeforeCases) return

    await this.ensureCompletedProfile(account)
    if (communicationCardSeededPhones.has(account.phone)) return

    const existing = await H5ApiClient.get<CommunicationCardRecord[]>('/medical/communication-cards')
    if (!existing.some((card) => card.title.startsWith('自动化沟通卡-'))) {
      await H5ApiClient.post<CommunicationCardRecord>('/medical/communication-cards', communicationCardSeedPayload(account))
    }
    communicationCardSeededPhones.add(account.phone)
  }
}
