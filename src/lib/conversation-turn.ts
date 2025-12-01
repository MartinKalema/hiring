// Represents a single turn in the conversation
export type SpeakerType = 'ai' | 'candidate'

export type TurnType =
  | 'greeting'          // AI introduction
  | 'question'          // AI asks a question
  | 'probe'             // AI asks follow-up for more detail
  | 'transition'        // AI transitions to new topic
  | 'clarification'     // AI asks for clarification
  | 'response'          // Candidate's response
  | 'acknowledgment'    // AI acknowledges answer before moving on
  | 'closing'           // AI wraps up interview

export interface ResponseAnalysis {
  // How specific was the answer?
  specificityLevel: 'vague' | 'moderate' | 'specific'

  // STAR method elements present
  starElements: {
    situation: boolean    // Did they set context?
    task: boolean         // Did they explain their responsibility?
    action: boolean       // Did they describe what THEY did?
    result: boolean       // Did they share outcomes?
  }

  // What competencies did this touch on?
  competenciesAddressed: string[]

  // Key phrases/claims to potentially probe
  claimsToVerify: string[]

  // Did they actually answer the question?
  answeredQuestion: boolean

  // Should we probe deeper?
  shouldProbe: boolean
  probeReason?: string

  // Sentiment/tone
  sentiment: 'positive' | 'neutral' | 'negative' | 'uncertain'
}

export class ConversationTurn {
  private constructor(
    public readonly id: string,
    public readonly speaker: SpeakerType,
    public readonly type: TurnType,
    public readonly content: string,
    public readonly timestamp: Date,
    public readonly durationMs?: number,
    public readonly audioUrl?: string,
    public readonly analysis?: ResponseAnalysis
  ) {}

  static createAITurn(
    id: string,
    type: TurnType,
    content: string,
    audioUrl?: string
  ): ConversationTurn {
    return new ConversationTurn(
      id,
      'ai',
      type,
      content,
      new Date(),
      undefined,
      audioUrl,
      undefined
    )
  }

  static createCandidateTurn(
    id: string,
    content: string,
    durationMs: number,
    audioUrl?: string,
    analysis?: ResponseAnalysis
  ): ConversationTurn {
    return new ConversationTurn(
      id,
      'candidate',
      'response',
      content,
      new Date(),
      durationMs,
      audioUrl,
      analysis
    )
  }

  isFromAI(): boolean {
    return this.speaker === 'ai'
  }

  isFromCandidate(): boolean {
    return this.speaker === 'candidate'
  }

  hasAnalysis(): boolean {
    return this.analysis !== undefined
  }

  toJSON(): object {
    return {
      id: this.id,
      speaker: this.speaker,
      type: this.type,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      durationMs: this.durationMs,
      audioUrl: this.audioUrl,
      analysis: this.analysis,
    }
  }
}
