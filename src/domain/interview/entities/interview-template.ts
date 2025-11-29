import { v4 as uuidv4 } from 'uuid'
import { InterviewStatus } from '../value-objects/interview-status'
import { CompetencyType } from '../value-objects/competency'

export interface InterviewConfig {
  // Time settings
  maxDurationMinutes: number          // e.g., 9 minutes

  // AI behavior
  depthLevel: 'quick' | 'standard' | 'deep'  // How thorough
  maxProbesPerCompetency: number      // Max follow-ups per topic

  // Voice settings
  aiVoice: string                     // ElevenLabs voice ID or name
  language: string                    // e.g., 'en-US'

  // Recording
  videoRequired: boolean

  // Candidate experience
  allowPause: boolean                 // Can candidate pause?
  showTranscript: boolean             // Show live transcript?
}

export interface MustAskQuestion {
  id: string
  content: string
  competency?: CompetencyType
  order: number
}

export class InterviewTemplate {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly createdBy: string,
    public readonly jobRequisitionId: string | null,
    public readonly name: string,
    public readonly jobTitle: string,
    public readonly jobDescription: string,
    public readonly companyName: string,
    public readonly competenciesToAssess: CompetencyType[],
    public readonly mustAskQuestions: MustAskQuestion[],
    public readonly config: InterviewConfig,
    public readonly status: InterviewStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static create(params: {
    organizationId: string
    createdBy: string
    jobRequisitionId?: string
    name: string
    jobTitle: string
    jobDescription: string
    companyName: string
    competenciesToAssess: CompetencyType[]
    mustAskQuestions?: MustAskQuestion[]
    config?: Partial<InterviewConfig>
  }): InterviewTemplate {
    const now = new Date()
    const defaultConfig: InterviewConfig = {
      maxDurationMinutes: 9,
      depthLevel: 'standard',
      maxProbesPerCompetency: 2,
      aiVoice: 'alloy',  // Default OpenAI voice
      language: 'en-US',
      videoRequired: true,
      allowPause: false,
      showTranscript: false,
    }

    return new InterviewTemplate(
      uuidv4(),
      params.organizationId,
      params.createdBy,
      params.jobRequisitionId || null,
      params.name,
      params.jobTitle,
      params.jobDescription,
      params.companyName,
      params.competenciesToAssess,
      params.mustAskQuestions || [],
      { ...defaultConfig, ...params.config },
      InterviewStatus.draft(),
      now,
      now
    )
  }

  static reconstitute(data: {
    id: string
    organizationId: string
    createdBy: string
    jobRequisitionId: string | null
    name: string
    jobTitle: string
    jobDescription: string
    companyName: string
    competenciesToAssess: CompetencyType[]
    mustAskQuestions: MustAskQuestion[]
    config: InterviewConfig
    status: string
    createdAt: Date
    updatedAt: Date
  }): InterviewTemplate {
    return new InterviewTemplate(
      data.id,
      data.organizationId,
      data.createdBy,
      data.jobRequisitionId,
      data.name,
      data.jobTitle,
      data.jobDescription,
      data.companyName,
      data.competenciesToAssess,
      data.mustAskQuestions,
      data.config,
      InterviewStatus.fromString(data.status),
      data.createdAt,
      data.updatedAt
    )
  }

  activate(): InterviewTemplate {
    if (!this.status.isDraft() && !this.status.getValue()) {
      throw new Error('Can only activate draft or paused interviews')
    }
    return new InterviewTemplate(
      this.id,
      this.organizationId,
      this.createdBy,
      this.jobRequisitionId,
      this.name,
      this.jobTitle,
      this.jobDescription,
      this.companyName,
      this.competenciesToAssess,
      this.mustAskQuestions,
      this.config,
      InterviewStatus.active(),
      this.createdAt,
      new Date()
    )
  }

  updateConfig(newConfig: Partial<InterviewConfig>): InterviewTemplate {
    return new InterviewTemplate(
      this.id,
      this.organizationId,
      this.createdBy,
      this.jobRequisitionId,
      this.name,
      this.jobTitle,
      this.jobDescription,
      this.companyName,
      this.competenciesToAssess,
      this.mustAskQuestions,
      { ...this.config, ...newConfig },
      this.status,
      this.createdAt,
      new Date()
    )
  }

  addMustAskQuestion(content: string, competency?: CompetencyType): InterviewTemplate {
    const newQuestion: MustAskQuestion = {
      id: uuidv4(),
      content,
      competency,
      order: this.mustAskQuestions.length,
    }
    return new InterviewTemplate(
      this.id,
      this.organizationId,
      this.createdBy,
      this.jobRequisitionId,
      this.name,
      this.jobTitle,
      this.jobDescription,
      this.companyName,
      this.competenciesToAssess,
      [...this.mustAskQuestions, newQuestion],
      this.config,
      this.status,
      this.createdAt,
      new Date()
    )
  }

  canAcceptCandidates(): boolean {
    return this.status.canAcceptCandidates()
  }

  getEstimatedDuration(): string {
    return `up to ${this.config.maxDurationMinutes} minutes`
  }
}
