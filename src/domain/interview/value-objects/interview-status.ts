export type InterviewStatusType =
  | 'draft'           // Interview created but not yet published
  | 'active'          // Accepting candidates
  | 'paused'          // Temporarily stopped
  | 'completed'       // All slots filled or manually closed
  | 'archived'        // Historical record

export class InterviewStatus {
  private constructor(private readonly value: InterviewStatusType) {}

  static draft(): InterviewStatus {
    return new InterviewStatus('draft')
  }

  static active(): InterviewStatus {
    return new InterviewStatus('active')
  }

  static paused(): InterviewStatus {
    return new InterviewStatus('paused')
  }

  static completed(): InterviewStatus {
    return new InterviewStatus('completed')
  }

  static archived(): InterviewStatus {
    return new InterviewStatus('archived')
  }

  static fromString(value: string): InterviewStatus {
    const validStatuses: InterviewStatusType[] = ['draft', 'active', 'paused', 'completed', 'archived']
    if (!validStatuses.includes(value as InterviewStatusType)) {
      throw new Error(`Invalid interview status: ${value}`)
    }
    return new InterviewStatus(value as InterviewStatusType)
  }

  getValue(): InterviewStatusType {
    return this.value
  }

  isDraft(): boolean {
    return this.value === 'draft'
  }

  isActive(): boolean {
    return this.value === 'active'
  }

  canAcceptCandidates(): boolean {
    return this.value === 'active'
  }

  equals(other: InterviewStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
