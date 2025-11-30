import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// POST /api/interview/[token]/voice - Get voice agent configuration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { candidateFirstName, candidateLastName, candidateEmail } = body

    // Validate the session
    const { data: session, error: sessionError } = await db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates (
          name,
          job_title,
          company_name,
          job_description,
          competencies_to_assess,
          must_ask_questions,
          config
        )
      `)
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Check expiry
    if (new Date() > new Date(session.expires_at)) {
      return NextResponse.json({ error: 'Interview link has expired' }, { status: 410 })
    }

    // Check if already completed
    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 410 })
    }

    // Update or create candidate info if provided
    if (candidateFirstName && candidateEmail) {
      // Check if candidate exists
      const { data: existingCandidate } = await db
        .from('candidates')
        .select('id')
        .eq('email', candidateEmail)
        .eq('organization_id', session.interview_templates.organization_id)
        .single()

      if (existingCandidate) {
        // Update candidate
        await db
          .from('candidates')
          .update({
            first_name: candidateFirstName,
            last_name: candidateLastName || '',
          })
          .eq('id', existingCandidate.id)

        // Update session
        await db
          .from('interview_sessions')
          .update({ candidate_id: existingCandidate.id })
          .eq('token', token)
      }
    }

    const template = session.interview_templates
    const config = template.config as Record<string, unknown> || {}

    // Build AI instructions based on template
    const competencies = (template.competencies_to_assess as string[]) || []
    const mustAskQuestions = (template.must_ask_questions as string[]) || []
    const maxDuration = (config.maxDurationMinutes as number) || 9
    const depthLevel = (config.depthLevel as string) || 'moderate'

    const depthInstructions = {
      light: 'Ask 1-2 follow-up questions per topic. Keep the interview conversational and brief.',
      moderate: 'Ask 2-3 follow-up questions per topic. Probe for specific examples when answers are vague.',
      deep: 'Ask 3-4 follow-up questions per topic. Thoroughly explore each competency with detailed probing.',
    }

    const instructions = `You are AIR, an AI interviewer conducting an interview for a ${template.job_title} position at ${template.company_name}.

Your role:
- Conduct a professional, conversational interview
- Ask behavioral and technical questions relevant to the role
- When answers are vague, probe deeper using the STAR method (Situation, Task, Action, Result)
- Be warm, encouraging, but professional
- Listen carefully and ask relevant follow-up questions

Interview structure:
1. Start with a warm greeting, introduce yourself as AIR, mention the role and company, and the time limit
2. Ask about their background and interest in the role
3. Cover the competencies systematically
4. For each answer, probe deeper if needed (ask for specific examples, outcomes, learnings)
5. If time permits, allow time for candidate questions
6. Close with next steps and thanks

COMPETENCIES TO ASSESS:
${competencies.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${mustAskQuestions.length > 0 ? `MUST ASK QUESTIONS:
${mustAskQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}

DEPTH LEVEL: ${depthLevel}
${depthInstructions[depthLevel as keyof typeof depthInstructions] || depthInstructions.moderate}

PROBING GUIDELINES:
- If an answer lacks specifics, ask: "Can you walk me through a specific example?"
- If no measurable outcomes, ask: "What was the result of that approach?"
- If unclear on their role, ask: "What was your specific contribution to that?"
- Maximum 2 follow-up probes per topic before moving on

TIMING:
- Maximum duration: ${maxDuration} minutes
- When 2 minutes remain, start wrapping up
- When 1 minute remains, thank the candidate and end gracefully

Candidate name: ${candidateFirstName} ${candidateLastName || ''}

Start by greeting ${candidateFirstName}, introducing yourself as AIR, explaining you'll be conducting their interview for the ${template.job_title} role at ${template.company_name}. Mention the interview will take about ${maxDuration} minutes and ask if they're ready to get started.`

    // Get Deepgram API key from environment
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY

    if (!deepgramApiKey) {
      return NextResponse.json({ error: 'Voice service not configured' }, { status: 503 })
    }

    // Mark session as started
    await db
      .from('interview_sessions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('token', token)

    return NextResponse.json({
      apiKey: deepgramApiKey,
      instructions,
      config: {
        voice: (config.aiVoice as string) || 'aura-asteria-en',
        thinkModel: 'claude-3-5-sonnet',
        thinkProvider: 'anthropic',
        maxDuration,
        language: (config.language as string) || 'en',
      },
      interview: {
        jobTitle: template.job_title,
        companyName: template.company_name,
        competencies,
      }
    })
  } catch (error) {
    console.error('Error getting voice config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
