import { v4 as uuidv4 } from 'uuid'
import { SessionStatus } from '../value-objects/session-status'
import { CompetencyType, CompetencyCoverage } from '../value-objects/competency'
import { ConversationTurn, ResponseAnalysis } from '../value-objects/conversation-turn'

export interface CandidateInfo {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  resumeUrl?: string
}

export interface SessionMetrics {
  totalDurationMs: number
  candidateSpeakingTimeMs: number
  aiSpeakingTimeMs: number
  turnCount: number
  averageResponseTimeMs: number
}

// The main aggregate for a single interview conversation
export class InterviewSession {
  private constructor(
    public readonly id: string,
    public readonly templateId: string,
    public readonly token: string,  // Unique URL token for candidate
    public readonly candidate: CandidateInfo | null,
    public readonly status: SessionStatus,
    public readonly competencyCoverage: CompetencyCoverage[],
    public readonly conversationHistory: ConversationTurn[],
    public readonly currentCompetencyIndex: number,
    public readonly metrics: SessionMetrics,
    public readonly videoUrl: string | null,
    public readonly fullTranscript: string | null,
    public readonly invitedAt: Date,
    public readonly startedAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly expiresAt: Date
  ) {}

  static create(params: {
    templateId: string
    competenciesToAssess: CompetencyType[]
    expiresInHours?: number
  }): InterviewSession {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (params.expiresInHours || 72) * 60 * 60 * 1000)

    // Initialize competency coverage tracking
    const competencyCoverage: CompetencyCoverage[] = params.competenciesToAssess.map(comp => ({
      competency: comp,
      covered: false,
      depth: 0,
      probeCount: 0,
      notes: [],
    }))

    return new InterviewSession(
      uuidv4(),
      params.templateId,
      uuidv4().replace(/-/g, ''),  // Clean token for URL
      null,
      SessionStatus.invited(),
      competencyCoverage,
      [],
      0,
      {
        totalDurationMs: 0,
        candidateSpeakingTimeMs: 0,
        aiSpeakingTimeMs: 0,
        turnCount: 0,
        averageResponseTimeMs: 0,
      },
      null,
      null,
      now,
      null,
      null,
      expiresAt
    )
  }

  static reconstitute(data: {
    id: string
    templateId: string
    token: string
    candidate: CandidateInfo | null
    status: string
    competencyCoverage: CompetencyCoverage[]
    conversationHistory: ConversationTurn[]
    currentCompetencyIndex: number
    metrics: SessionMetrics
    videoUrl: string | null
    fullTranscript: string | null
    invitedAt: Date
    startedAt: Date | null
    completedAt: Date | null
    expiresAt: Date
  }): InterviewSession {
    return new InterviewSession(
      data.id,
      data.templateId,
      data.token,
      data.candidate,
      SessionStatus.fromString(data.status),
      data.competencyCoverage,
      data.conversationHistory,
      data.currentCompetencyIndex,
      data.metrics,
      data.videoUrl,
      data.fullTranscript,
      data.invitedAt,
      data.startedAt,
      data.completedAt,
      data.expiresAt
    )
  }

  // Candidate registers their info before starting
  registerCandidate(candidate: CandidateInfo): InterviewSession {
    if (this.candidate !== null) {
      throw new Error('Candidate already registered')
    }
    return new InterviewSession(
      this.id,
      this.templateId,
      this.token,
      candidate,
      SessionStatus.started(),
      this.competencyCoverage,
      this.conversationHistory,
      this.currentCompetencyIndex,
      this.metrics,
      this.videoUrl,
      this.fullTranscript,
      this.invitedAt,
      new Date(),
      this.completedAt,
      this.expiresAt
    )
  }

  // Interview begins - AI sends greeting
  beginInterview(greetingTurn: ConversationTurn): InterviewSession {
    if (!this.status.canStart()) {
      throw new Error(`Cannot start interview in status: ${this.status.toString()}`)
    }
    return new InterviewSession(
      this.id,
      this.templateId,
      this.token,
      this.candidate,
      SessionStatus.inProgress(),
      this.competencyCoverage,
      [greetingTurn],
      this.currentCompetencyIndex,
      this.metrics,
      this.videoUrl,
      this.fullTranscript,
      this.invitedAt,
      this.startedAt || new Date(),
      this.completedAt,
      this.expiresAt
    )
  }

  // Add AI turn (question, probe, transition, etc.)
  addAITurn(turn: ConversationTurn): InterviewSession {
    if (!this.status.isActive()) {
      throw new Error('Interview is not active')
    }
    return new InterviewSession(
      this.id,
      this.templateId,
      this.token,
      this.candidate,
      this.status,
      this.competencyCoverage,
      [...this.conversationHistory, turn],
      this.currentCompetencyIndex,
      {
        ...this.metrics,
        turnCount: this.metrics.turnCount + 1,
      },
      this.videoUrl,
      this.fullTranscript,
      this.invitedAt,
      this.startedAt,
      this.completedAt,
      this.expiresAt
    )
  }

  // Add candidate response with analysis
  addCandidateResponse(
    turn: ConversationTurn,
    analysis: ResponseAnalysis
  ): InterviewSession {
    if (!this.status.isActive()) {
      throw new Error('Interview is not active')
    }

    // Update competency coverage based on analysis
    const updatedCoverage = this.competencyCoverage.map(coverage => {
      if (analysis.competenciesAddressed.includes(coverage.competency)) {
        return {
          ...coverage,
          covered: true,
          depth: Math.min(3, coverage.depth + 1),
          notes: [...coverage.notes, turn.content.substring(0, 200)],
        }
      }
      return coverage
    })

    const newMetrics = {
      ...this.metrics,
      turnCount: this.metrics.turnCount + 1,
      candidateSpeakingTimeMs: this.metrics.candidateSpeakingTimeMs + (turn.durationMs || 0),
    }

    return new InterviewSession(
      this.id,
      this.templateId,
      this.token,
      this.candidate,
      this.status,
      updatedCoverage,
      [...this.conversationHistory, turn],
      this.currentCompetencyIndex,
      newMetrics,
      this.videoUrl,
      this.fullTranscript,
      this.invitedAt,
      this.startedAt,
      this.completedAt,
      this.expiresAt
    )
  }

  // Move to next competency
  advanceToNextCompetency(): InterviewSession {
    return new InterviewSession(
      this.id,
      this.templateId,
      this.token,
      this.candidate,
      this.status,
      this.competencyCoverage,
      this.conversationHistory,
      this.currentCompetencyIndex + 1,
      this.metrics,
      this.videoUrl,
      this.fullTranscript,
      this.invitedAt,
      this.startedAt,
      this.completedAt,
      this.expiresAt
    )
  }

  // Mark probe used for current competency
  markProbeUsed(): InterviewSession {
    const updatedCoverage = this.competencyCoverage.map((coverage, idx) => {
      if (idx === this.currentCompetencyIndex) {
        return { ...coverage, probeCount: coverage.probeCount + 1 }
      }
      return coverage
    })

    return new InterviewSession(
      this.id,
      this.templateId,
      this.token,
      this.candidate,
      this.status,
      updatedCoverage,
      this.conversationHistory,
      this.currentCompetencyIndex,
      this.metrics,
      this.videoUrl,
      this.fullTranscript,
      this.invitedAt,
      this.startedAt,
      this.completedAt,
      this.expiresAt
    )
  }

  // Complete the interview
  complete(
    closingTurn: ConversationTurn,
    videoUrl?: string
  ): InterviewSession {
    const fullTranscript = this.conversationHistory
      .map(t => `${t.speaker.toUpperCase()}: ${t.content}`)
      .join('\n\n')

    const totalDuration = this.startedAt
      ? new Date().getTime() - this.startedAt.getTime()
      : 0

    return new InterviewSession(
      this.id,
      this.templateId,
      this.token,
      this.candidate,
      SessionStatus.completed(),
      this.competencyCoverage,
      [...this.conversationHistory, closingTurn],
      this.currentCompetencyIndex,
      {
        ...this.metrics,
        totalDurationMs: totalDuration,
      },
      videoUrl || this.videoUrl,
      fullTranscript,
      this.invitedAt,
      this.startedAt,
      new Date(),
      this.expiresAt
    )
  }

  // Check if interview should wrap up due to time
  shouldWrapUp(maxDurationMinutes: number): boolean {
    if (!this.startedAt) return false
    const elapsedMs = new Date().getTime() - this.startedAt.getTime()
    const remainingMs = (maxDurationMinutes * 60 * 1000) - elapsedMs
    return remainingMs < 60000  // Less than 1 minute remaining
  }

  // Get current competency being assessed
  getCurrentCompetency(): CompetencyCoverage | null {
    return this.competencyCoverage[this.currentCompetencyIndex] || null
  }

  // Check if all competencies covered
  allCompetenciesCovered(): boolean {
    return this.competencyCoverage.every(c => c.covered && c.depth >= 1)
  }

  // Get elapsed time in seconds
  getElapsedSeconds(): number {
    if (!this.startedAt) return 0
    return Math.floor((new Date().getTime() - this.startedAt.getTime()) / 1000)
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  canJoin(): boolean {
    return !this.isExpired() && this.status.canStart()
  }
}
