import Anthropic from '@anthropic-ai/sdk'
import { AIResponseGenerator } from '@/application/interview/services/conversation-orchestrator'
import { InterviewTemplate } from '@/domain/interview/entities/interview-template'
import { InterviewSession } from '@/domain/interview/entities/interview-session'
import { CompetencyCoverage, Competency } from '@/domain/interview/value-objects/competency'
import { ConversationTurn, ResponseAnalysis } from '@/domain/interview/value-objects/conversation-turn'
import { OrchestratorDecision } from '@/application/interview/services/conversation-orchestrator'

export class ClaudeResponseGenerator implements AIResponseGenerator {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    })
  }

  async generateGreeting(
    candidateName: string,
    jobTitle: string,
    companyName: string,
    maxDurationMinutes: number
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are AIR, an AI interviewer. Generate a warm, professional greeting for a job interview.

Candidate name: ${candidateName}
Job title: ${jobTitle}
Company: ${companyName}
Interview duration: up to ${maxDurationMinutes} minutes

Requirements:
- Be warm but professional
- Mention your name (AIR) and that you're an AI interviewer
- State the role they're interviewing for
- Mention the time limit
- Ask them to ensure they're in a quiet, well-lit place
- End by asking if they're ready to begin

Keep it concise (2-3 sentences). Do not use phrases like "I hope you're doing well" - get to the point.`
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }
    return content.text
  }

  async generateQuestion(
    template: InterviewTemplate,
    session: InterviewSession,
    competency: CompetencyCoverage,
    decision: OrchestratorDecision
  ): Promise<string> {
    const competencyInfo = Competency.fromType(competency.competency)
    const conversationContext = this.formatConversationHistory(session.conversationHistory)

    // Check if there's a must-ask question for this competency
    const mustAsk = template.mustAskQuestions.find(q => q.competency === competency.competency)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are AIR, an AI interviewer conducting a ${template.jobTitle} interview.

Job description:
${template.jobDescription}

Competency to assess: ${competencyInfo.getDisplayName()}
Description: ${competencyInfo.getDescription()}

${mustAsk ? `REQUIRED QUESTION (must incorporate this): "${mustAsk.content}"` : ''}

Conversation so far:
${conversationContext || 'Just started the interview.'}

Time remaining context: ${decision.context?.timeRemainingSeconds || 0} seconds
Competencies remaining: ${(decision.context?.totalCompetencies || 0) - (decision.context?.competenciesCovered || 0)}

Generate a natural, conversational question to assess this competency. Requirements:
- If there's a required question, use it but make it sound natural
- Otherwise, generate a behavioral question (tell me about a time...) or situational question
- Reference something from their previous answers if relevant
- Be concise but clear
- Don't be robotic or formulaic
- Just output the question, no preamble`
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }
    return content.text
  }

  async generateProbe(
    template: InterviewTemplate,
    session: InterviewSession,
    lastResponse: string,
    analysis: ResponseAnalysis
  ): Promise<string> {
    const conversationContext = this.formatConversationHistory(session.conversationHistory)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are AIR, an AI interviewer for a ${template.jobTitle} role.

Conversation so far:
${conversationContext}

Candidate's last response: "${lastResponse}"

Analysis of their response:
- Specificity: ${analysis.specificityLevel}
- STAR elements present: Situation=${analysis.starElements.situation}, Task=${analysis.starElements.task}, Action=${analysis.starElements.action}, Result=${analysis.starElements.result}
- Probe reason: ${analysis.probeReason || 'Need more detail'}
- Claims to verify: ${analysis.claimsToVerify.join(', ') || 'None specific'}

Generate a follow-up probe question that:
1. Acknowledges what they said (briefly)
2. Asks for MORE SPECIFIC details about their actual role/actions
3. Guides them toward providing concrete examples
4. References something specific they mentioned
5. Sounds natural and conversational

Example patterns:
- "I'd like to understand more about your specific role in that. Could you walk me through..."
- "You mentioned [X]. Can you give me a concrete example of..."
- "What specifically did YOU do in that situation?"

Just output the probe question, nothing else.`
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }
    return content.text
  }

  async generateTransition(
    template: InterviewTemplate,
    session: InterviewSession,
    fromCompetency: string,
    toCompetency: string,
    reason: 'complete' | 'time_constraint'
  ): Promise<string> {
    const toCompetencyInfo = Competency.fromType(toCompetency as any)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are AIR, an AI interviewer for a ${template.jobTitle} role.

Need to transition from discussing "${fromCompetency}" to "${toCompetencyInfo.getDisplayName()}".
Reason: ${reason === 'time_constraint' ? 'Running low on time' : 'Topic sufficiently covered'}

Generate a brief, natural transition that:
1. ${reason === 'time_constraint' ? 'Mentions time constraints ("Given our time...")' : 'Briefly acknowledges their answer'}
2. Smoothly introduces the next topic
3. Sounds conversational, not robotic
4. Is concise (1-2 sentences max)

Just output the transition, nothing else.`
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }
    return content.text
  }

  async generateClosing(
    candidateName: string,
    jobTitle: string,
    companyName: string
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are AIR, an AI interviewer. Generate a closing statement for the interview.

Candidate: ${candidateName}
Role: ${jobTitle}
Company: ${companyName}

Requirements:
- Thank them for their time
- Let them know the hiring team will review their responses
- Mention they'll hear back about next steps
- Be warm but professional
- Keep it brief (2-3 sentences)
- Wish them well

Just output the closing, nothing else.`
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }
    return content.text
  }

  async analyzeResponse(
    response: string,
    question: string,
    competency: string,
    conversationHistory: ConversationTurn[]
  ): Promise<ResponseAnalysis> {
    const analysisResponse = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Analyze this interview response.

Question asked: "${question}"
Competency being assessed: ${competency}
Candidate's response: "${response}"

Provide analysis in this exact JSON format:
{
  "specificityLevel": "vague" | "moderate" | "specific",
  "starElements": {
    "situation": true/false,
    "task": true/false,
    "action": true/false,
    "result": true/false
  },
  "competenciesAddressed": ["list", "of", "competencies"],
  "claimsToVerify": ["specific claims they made that could be probed"],
  "answeredQuestion": true/false,
  "shouldProbe": true/false,
  "probeReason": "reason if shouldProbe is true",
  "sentiment": "positive" | "neutral" | "negative" | "uncertain"
}

Criteria:
- "vague": Generic statements, no specific examples, uses "we" instead of "I"
- "moderate": Some specifics but missing key details
- "specific": Clear examples, specific actions THEY took, measurable outcomes

Output ONLY the JSON, no other text.`
        }
      ]
    })

    const content = analysisResponse.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    try {
      return JSON.parse(content.text) as ResponseAnalysis
    } catch {
      // Fallback if JSON parsing fails
      return {
        specificityLevel: 'moderate',
        starElements: {
          situation: false,
          task: false,
          action: false,
          result: false,
        },
        competenciesAddressed: [competency],
        claimsToVerify: [],
        answeredQuestion: true,
        shouldProbe: false,
        sentiment: 'neutral',
      }
    }
  }

  private formatConversationHistory(history: ConversationTurn[]): string {
    if (history.length === 0) return ''

    return history
      .map(turn => `${turn.speaker.toUpperCase()}: ${turn.content}`)
      .join('\n\n')
  }
}
