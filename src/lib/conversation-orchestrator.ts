import { InterviewSession } from '@/lib/interview-session'
import { InterviewTemplate } from '@/lib/interview-template'
import { ConversationTurn, ResponseAnalysis } from '@/lib/conversation-turn'
import { CompetencyCoverage } from '@/lib/competency'
import { v4 as uuidv4 } from 'uuid'

export type DecisionType =
  | 'ask_question'      // Start with a new competency
  | 'probe'             // Dig deeper into vague answer
  | 'acknowledge_move'  // Good answer, move to next topic
  | 'time_transition'   // Running low on time, must move on
  | 'wrap_up'           // End the interview

export interface OrchestratorDecision {
  type: DecisionType
  reason: string
  targetCompetency?: string
  context?: {
    timeRemainingSeconds: number
    competenciesCovered: number
    totalCompetencies: number
    currentDepth: number
    probeCount: number
  }
}

export interface AIResponseGenerator {
  generateGreeting(
    candidateName: string,
    jobTitle: string,
    companyName: string,
    maxDurationMinutes: number
  ): Promise<string>

  generateQuestion(
    template: InterviewTemplate,
    session: InterviewSession,
    competency: CompetencyCoverage,
    decision: OrchestratorDecision
  ): Promise<string>

  generateProbe(
    template: InterviewTemplate,
    session: InterviewSession,
    lastResponse: string,
    analysis: ResponseAnalysis
  ): Promise<string>

  generateTransition(
    template: InterviewTemplate,
    session: InterviewSession,
    fromCompetency: string,
    toCompetency: string,
    reason: 'complete' | 'time_constraint'
  ): Promise<string>

  generateClosing(
    candidateName: string,
    jobTitle: string,
    companyName: string
  ): Promise<string>

  analyzeResponse(
    response: string,
    question: string,
    competency: string,
    conversationHistory: ConversationTurn[]
  ): Promise<ResponseAnalysis>
}

export class ConversationOrchestrator {
  constructor(
    private readonly aiGenerator: AIResponseGenerator
  ) {}

  // Decide what to do next based on current state
  decide(
    template: InterviewTemplate,
    session: InterviewSession,
    lastAnalysis?: ResponseAnalysis
  ): OrchestratorDecision {
    const timeRemaining = (template.config.maxDurationMinutes * 60) - session.getElapsedSeconds()
    const currentCompetency = session.getCurrentCompetency()
    const competenciesCovered = session.competencyCoverage.filter(c => c.covered).length
    const totalCompetencies = session.competencyCoverage.length

    const context = {
      timeRemainingSeconds: timeRemaining,
      competenciesCovered,
      totalCompetencies,
      currentDepth: currentCompetency?.depth || 0,
      probeCount: currentCompetency?.probeCount || 0,
    }

    // 1. Time check - must wrap up if < 30 seconds
    if (timeRemaining < 30) {
      return {
        type: 'wrap_up',
        reason: 'Interview time limit reached',
        context,
      }
    }

    // 2. All competencies covered - wrap up
    if (session.allCompetenciesCovered() || session.currentCompetencyIndex >= totalCompetencies) {
      return {
        type: 'wrap_up',
        reason: 'All competencies have been assessed',
        context,
      }
    }

    // 3. No current analysis means we need to ask a question
    if (!lastAnalysis) {
      return {
        type: 'ask_question',
        reason: 'Starting new competency assessment',
        targetCompetency: currentCompetency?.competency,
        context,
      }
    }

    // 4. Answer was vague and we haven't probed too much - probe deeper
    if (
      lastAnalysis.shouldProbe &&
      lastAnalysis.specificityLevel === 'vague' &&
      (currentCompetency?.probeCount || 0) < template.config.maxProbesPerCompetency
    ) {
      return {
        type: 'probe',
        reason: lastAnalysis.probeReason || 'Answer lacked specificity, need more detail',
        targetCompetency: currentCompetency?.competency,
        context,
      }
    }

    // 5. Running low on time but competencies remaining - time transition
    const estimatedTimePerCompetency = 90  // 1.5 min average
    const competenciesRemaining = totalCompetencies - competenciesCovered
    const timeNeeded = competenciesRemaining * estimatedTimePerCompetency

    if (timeRemaining < timeNeeded && competenciesRemaining > 1) {
      return {
        type: 'time_transition',
        reason: 'Time constraints require moving to next topic',
        targetCompetency: session.competencyCoverage[session.currentCompetencyIndex + 1]?.competency,
        context,
      }
    }

    // 6. Good answer or max probes reached - acknowledge and move on
    return {
      type: 'acknowledge_move',
      reason: 'Competency sufficiently covered, moving to next topic',
      targetCompetency: session.competencyCoverage[session.currentCompetencyIndex + 1]?.competency,
      context,
    }
  }

  // Execute a decision and get the AI's response
  async execute(
    decision: OrchestratorDecision,
    template: InterviewTemplate,
    session: InterviewSession,
    lastResponse?: string,
    lastAnalysis?: ResponseAnalysis
  ): Promise<ConversationTurn> {
    const turnId = uuidv4()

    switch (decision.type) {
      case 'ask_question': {
        const currentCompetency = session.getCurrentCompetency()
        if (!currentCompetency) {
          throw new Error('No current competency to assess')
        }
        const content = await this.aiGenerator.generateQuestion(
          template,
          session,
          currentCompetency,
          decision
        )
        return ConversationTurn.createAITurn(turnId, 'question', content)
      }

      case 'probe': {
        if (!lastResponse || !lastAnalysis) {
          throw new Error('Cannot probe without previous response')
        }
        const content = await this.aiGenerator.generateProbe(
          template,
          session,
          lastResponse,
          lastAnalysis
        )
        return ConversationTurn.createAITurn(turnId, 'probe', content)
      }

      case 'acknowledge_move':
      case 'time_transition': {
        const currentCompetency = session.getCurrentCompetency()
        const nextCompetency = session.competencyCoverage[session.currentCompetencyIndex + 1]

        if (!nextCompetency) {
          // No more competencies, generate closing instead
          const content = await this.aiGenerator.generateClosing(
            session.candidate?.firstName || 'there',
            template.jobTitle,
            template.companyName
          )
          return ConversationTurn.createAITurn(turnId, 'closing', content)
        }

        const content = await this.aiGenerator.generateTransition(
          template,
          session,
          currentCompetency?.competency || 'previous topic',
          nextCompetency.competency,
          decision.type === 'time_transition' ? 'time_constraint' : 'complete'
        )
        return ConversationTurn.createAITurn(turnId, 'transition', content)
      }

      case 'wrap_up': {
        const content = await this.aiGenerator.generateClosing(
          session.candidate?.firstName || 'there',
          template.jobTitle,
          template.companyName
        )
        return ConversationTurn.createAITurn(turnId, 'closing', content)
      }

      default:
        throw new Error(`Unknown decision type: ${decision.type}`)
    }
  }

  // Generate the opening greeting
  async generateGreeting(
    template: InterviewTemplate,
    candidateName: string
  ): Promise<ConversationTurn> {
    const content = await this.aiGenerator.generateGreeting(
      candidateName,
      template.jobTitle,
      template.companyName,
      template.config.maxDurationMinutes
    )
    return ConversationTurn.createAITurn(uuidv4(), 'greeting', content)
  }

  // Analyze a candidate's response
  async analyzeResponse(
    response: string,
    session: InterviewSession
  ): Promise<ResponseAnalysis> {
    const lastAITurn = [...session.conversationHistory]
      .reverse()
      .find(t => t.isFromAI())

    const currentCompetency = session.getCurrentCompetency()

    return this.aiGenerator.analyzeResponse(
      response,
      lastAITurn?.content || '',
      currentCompetency?.competency || '',
      session.conversationHistory
    )
  }
}
