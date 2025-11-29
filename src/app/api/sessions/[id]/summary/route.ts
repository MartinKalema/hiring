import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/database'

// GET /api/sessions/[id]/summary - Get interview summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    const { id } = await params

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session belongs to organization
    const { data: session } = await db
      .from('interview_sessions')
      .select(`
        id,
        interview_templates!inner (
          organization_id
        )
      `)
      .eq('id', id)
      .eq('interview_templates.organization_id', orgId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: summary, error } = await db
      .from('interview_summaries')
      .select('*')
      .eq('session_id', id)
      .single()

    if (error || !summary) {
      return NextResponse.json({ error: 'Summary not yet generated' }, { status: 404 })
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sessions/[id]/summary - Generate interview summary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    const { id } = await params

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session with template and candidate
    const { data: session, error: sessionError } = await db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates!inner (
          *,
          organization_id
        ),
        candidates (
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .eq('interview_templates.organization_id', orgId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Interview not yet completed' }, { status: 400 })
    }

    // Check if summary already exists
    const { data: existingSummary } = await db
      .from('interview_summaries')
      .select('*')
      .eq('session_id', id)
      .single()

    if (existingSummary) {
      return NextResponse.json({ error: 'Summary already exists', summary: existingSummary }, { status: 409 })
    }

    // Generate summary using Claude
    const conversationHistory = (session.conversation_history as Array<{
      role: string
      content: string
      competencyId?: string
    }>) || []

    const template = session.interview_templates
    const competencies = (template.competencies_to_assess as Array<{
      name: string
      description: string
      weight: number
      requiredLevel: string
    }>) || []

    const prompt = buildSummaryPrompt(
      template.job_title,
      template.job_description,
      competencies,
      conversationHistory,
      session.candidates?.first_name,
      session.candidates?.last_name
    )

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error('Claude API error:', await response.text())
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
    }

    const claudeResponse = await response.json()
    const summaryContent = claudeResponse.content[0].text

    // Parse the structured response
    const parsedSummary = parseSummaryResponse(summaryContent)

    // Save summary
    const { data: summary, error: summaryError } = await db
      .from('interview_summaries')
      .insert({
        session_id: id,
        summary_text: parsedSummary.summaryText,
        key_strengths: parsedSummary.keyStrengths,
        areas_of_concern: parsedSummary.areasOfConcern,
        skills_mentioned: parsedSummary.skillsMentioned,
        competency_scores: parsedSummary.competencyScores,
        recommendation: parsedSummary.recommendation,
        recommendation_confidence: parsedSummary.recommendationConfidence,
        recommendation_reasoning: parsedSummary.recommendationReasoning,
      })
      .select()
      .single()

    if (summaryError) {
      console.error('Error saving summary:', summaryError)
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    return NextResponse.json(summary, { status: 201 })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildSummaryPrompt(
  jobTitle: string,
  jobDescription: string,
  competencies: Array<{ name: string; description: string; weight: number; requiredLevel: string }>,
  conversationHistory: Array<{ role: string; content: string; competencyId?: string }>,
  firstName?: string,
  lastName?: string
): string {
  const candidateName = firstName && lastName ? `${firstName} ${lastName}` : 'The candidate'
  const transcript = conversationHistory
    .map(turn => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join('\n\n')

  return `You are an expert technical interviewer analyzing an AI-conducted interview for the position of ${jobTitle}.

## Job Description
${jobDescription}

## Competencies Assessed
${competencies.map(c => `- ${c.name} (Weight: ${c.weight}%, Required Level: ${c.requiredLevel}): ${c.description}`).join('\n')}

## Interview Transcript
${transcript}

## Your Task
Analyze this interview and provide a structured assessment. Respond in the following JSON format:

{
  "summaryText": "A 2-3 paragraph executive summary of the interview",
  "keyStrengths": ["strength1", "strength2", "strength3"],
  "areasOfConcern": ["concern1", "concern2"],
  "skillsMentioned": ["skill1", "skill2", "skill3"],
  "competencyScores": [
    {
      "competencyName": "name",
      "score": 1-5,
      "notes": "brief explanation"
    }
  ],
  "recommendation": "strong_yes|yes|maybe|no|strong_no",
  "recommendationConfidence": 0.0-1.0,
  "recommendationReasoning": "2-3 sentences explaining the recommendation"
}

Important:
- Be objective and evidence-based
- Score competencies from 1 (poor) to 5 (excellent)
- Consider the required level for each competency
- The recommendation should reflect whether ${candidateName} meets the requirements for this role
- Only return valid JSON, no other text`
}

function parseSummaryResponse(content: string): {
  summaryText: string
  keyStrengths: string[]
  areasOfConcern: string[]
  skillsMentioned: string[]
  competencyScores: Array<{ competencyName: string; score: number; notes: string }>
  recommendation: string
  recommendationConfidence: number
  recommendationReasoning: string
} {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content)
    return {
      summaryText: parsed.summaryText || '',
      keyStrengths: parsed.keyStrengths || [],
      areasOfConcern: parsed.areasOfConcern || [],
      skillsMentioned: parsed.skillsMentioned || [],
      competencyScores: parsed.competencyScores || [],
      recommendation: parsed.recommendation || 'maybe',
      recommendationConfidence: parsed.recommendationConfidence || 0.5,
      recommendationReasoning: parsed.recommendationReasoning || '',
    }
  } catch {
    // If JSON parsing fails, return defaults with the raw content as summary
    return {
      summaryText: content,
      keyStrengths: [],
      areasOfConcern: [],
      skillsMentioned: [],
      competencyScores: [],
      recommendation: 'maybe',
      recommendationConfidence: 0.5,
      recommendationReasoning: 'Unable to parse structured response',
    }
  }
}
