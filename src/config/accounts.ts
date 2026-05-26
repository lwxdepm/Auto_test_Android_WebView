import { env } from './env.js'

export interface TestAccount {
  name: string
  phone: string
  fixedCode: string
  /** 是否预期登录后能直接进入 /chat。新账号通常会进入 /profile。 */
  expectChatReady?: boolean
}

export const accounts = {
  normal: {
    name: 'A-normal',
    phone: env.testPhoneA,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  second: {
    name: 'B-second',
    phone: env.testPhoneB,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  needsProfile: {
    name: 'C-needs-profile',
    phone: env.testPhoneNeedsProfile,
    fixedCode: env.smsFixedCode,
    expectChatReady: false,
  } satisfies TestAccount,
  materialsEmpty: {
    name: 'D-materials-empty',
    phone: env.testPhoneMaterialsEmpty,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  materialsCard: {
    name: 'E-materials-card',
    phone: env.testPhoneMaterialsCard,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  noHealthConsent: {
    name: 'F-no-health-consent',
    phone: env.testPhoneNoHealthConsent,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  medicalPurge: {
    name: 'H-medical-purge',
    phone: env.testPhoneMedicalPurge,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  medicalDoc: {
    name: 'I-medical-doc',
    phone: env.testPhoneMedicalDoc,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  business: {
    name: 'J-business',
    phone: env.testPhoneBusiness,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  materialsFull: {
    name: 'K-materials-full',
    phone: env.testPhoneMaterialsFull,
    fixedCode: env.smsFixedCode,
    expectChatReady: true,
  } satisfies TestAccount,
  pendingDeletion: {
    name: 'G-pending-deletion',
    phone: env.testPhonePending,
    fixedCode: env.smsFixedCode,
    expectChatReady: false,
  } satisfies TestAccount,
}
