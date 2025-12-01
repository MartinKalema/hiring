export type SessionStatusType =
  | 'invited'         // Link sent to candidate
  | 'started'         // Candidate opened link, in setup
  | 'in_progress'     // Interview conversation active
  | 'completed'       // Interview finished normally
  | 'abandoned'       // Candidate left without completing
  | 'expired'         // Link expired before completion
  | 'technical_error' // Failed due to technical issues

export class SessionStatus {
  private constructor(private readonly value: SessionStatusType) {}

  static invited(): SessionStatus {
    return new SessionStatus('invited')
  }

  static started(): SessionStatus {
    return new SessionStatus('started')
  }

  static inProgress(): SessionStatus {
    return new SessionStatus('in_progress')
  }

  static completed(): SessionStatus {
    return new SessionStatus('completed')
  }

  static abandoned(): SessionStatus {
    return new SessionStatus('abandoned')
  }

  static expired(): SessionStatus {
    return new SessionStatus('expired')
  }

  static technicalError(): SessionStatus {
    return new SessionStatus('technical_error')
  }

  static fromString(value: string): SessionStatus {
    const validStatuses: SessionStatusType[] = [
      'invited', 'started', 'in_progress', 'completed',
      'abandoned', 'expired', 'technical_error'
    ]
    if (!validStatuses.includes(value as SessionStatusType)) {
      throw new Error(`Invalid session status: ${value}`)
    }
    return new SessionStatus(value as SessionStatusType)
  }

  getValue(): SessionStatusType {
    return this.value
  }

  canStart(): boolean {
    return this.value === 'invited' || this.value === 'started'
  }

  isActive(): boolean {
    return this.value === 'in_progress'
  }

  isFinished(): boolean {
    return ['completed', 'abandoned', 'expired', 'technical_error'].includes(this.value)
  }

  equals(other: SessionStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
