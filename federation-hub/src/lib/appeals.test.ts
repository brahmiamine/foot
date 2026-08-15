import { describe, expect, it } from 'vitest'
import { assertAppealTransition } from '../../../packages/regulatory-shared/src/appeals'
describe('appeal workflow', () => {
  it('progresses SUBMITTED -> ADMISSIBILITY_REVIEW -> UNDER_REVIEW -> HEARING/DECIDED', () => {
    expect(() => assertAppealTransition('SUBMITTED', 'ADMISSIBILITY_REVIEW')).not.toThrow()
    expect(() => assertAppealTransition('ADMISSIBILITY_REVIEW', 'UNDER_REVIEW')).not.toThrow()
    expect(() => assertAppealTransition('UNDER_REVIEW', 'HEARING')).not.toThrow()
    expect(() => assertAppealTransition('UNDER_REVIEW', 'DECIDED')).not.toThrow()
    expect(() => assertAppealTransition('HEARING', 'DECIDED')).not.toThrow()
  })
  it('never allows skipping straight from SUBMITTED to DECIDED', () => {
    expect(() => assertAppealTransition('SUBMITTED', 'DECIDED')).toThrow()
  })
  it('makes DECIDED, REJECTED and WITHDRAWN terminal', () => {
    expect(() => assertAppealTransition('DECIDED', 'UNDER_REVIEW')).toThrow()
    expect(() => assertAppealTransition('REJECTED', 'UNDER_REVIEW')).toThrow()
    expect(() => assertAppealTransition('WITHDRAWN', 'SUBMITTED')).toThrow()
  })
  it('allows withdrawal at any open stage', () => {
    expect(() => assertAppealTransition('SUBMITTED', 'WITHDRAWN')).not.toThrow()
    expect(() => assertAppealTransition('UNDER_REVIEW', 'WITHDRAWN')).not.toThrow()
    expect(() => assertAppealTransition('HEARING', 'WITHDRAWN')).not.toThrow()
  })
})
