import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BREAST_TUMOR_EXTENSION_PROFILE_SEED,
  CX_MED_017_MEDICATION_PRECONDITION,
  VALID_TUMOR_TYPES,
} from './medical-test-data.js'

test('CX-MED-029 seed uses a current valid tumorType enum', () => {
  assert.ok(
    VALID_TUMOR_TYPES.includes(BREAST_TUMOR_EXTENSION_PROFILE_SEED.tumorType),
    `tumorType seed is not in current product enum: ${BREAST_TUMOR_EXTENSION_PROFILE_SEED.tumorType}`,
  )
  assert.notEqual(
    BREAST_TUMOR_EXTENSION_PROFILE_SEED.tumorType,
    'her2_positive',
    'legacy HER2-only tumorType should not be used by CX-MED-029 seed data',
  )
})

test('CX-MED-017 seed starts from a concrete medication before switching to no medication', () => {
  assert.deepEqual(CX_MED_017_MEDICATION_PRECONDITION.medications, ['letrozole'])
  assert.equal(CX_MED_017_MEDICATION_PRECONDITION.medicationCustom, '')
  assert.equal(CX_MED_017_MEDICATION_PRECONDITION.medicationDuration, 'within_1m')
  assert.deepEqual(CX_MED_017_MEDICATION_PRECONDITION.medicationDurations, {})
})
