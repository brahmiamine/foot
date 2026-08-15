export interface HeadCoachQualificationCheckRequest {
  staffId: string
  clubId: string
  seasonId: string
  matchDate: Date | string
}

export interface HeadCoachQualificationResult {
  eligible: boolean
  requiredQualification: string | null
}

export interface StaffQualificationServicePort {
  checkHeadCoachQualification(
    input: HeadCoachQualificationCheckRequest,
  ): Promise<HeadCoachQualificationResult>
}
