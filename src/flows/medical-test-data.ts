export const VALID_TUMOR_TYPES = [
  'luminal_a',
  'luminal_b_her2_negative',
  'luminal_b_her2_positive',
  'her2_positive_hr_negative',
  'triple_negative',
  'unknown_or_untested',
] as const

export type ValidTumorType = (typeof VALID_TUMOR_TYPES)[number]

export const CX_MED_017_MEDICATION_PRECONDITION = {
  medications: ['letrozole'],
  medicationCustom: '',
  medicationDuration: 'within_1m',
  medicationDurations: {},
} as const

export const BREAST_TUMOR_EXTENSION_PROFILE_SEED = {
  tumorType: 'her2_positive_hr_negative' as ValidTumorType,
  diagnosisDuration: 'within_3m',
  treatmentPhase: 'on_chemo',
  medications: ['tamoxifen'],
  medicationDuration: 'within_1m',
} as const
