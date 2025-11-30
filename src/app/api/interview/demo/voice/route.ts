import { NextRequest, NextResponse } from 'next/server'

// POST /api/interview/demo/voice - Get voice agent configuration for demo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidateFirstName, candidateLastName } = body

    // Demo interview configuration
    const jobTitle = 'Senior Software Engineer'
    const companyName = 'Demo Company'
    const maxDuration = 9

    const instructions = `You are AIR, an AI interviewer conducting a demo interview for a ${jobTitle} position at ${companyName}.

Your role:
- Conduct a professional, conversational interview
- Ask behavioral and technical questions relevant to the role
- When answers are vague, probe deeper using the STAR method (Situation, Task, Action, Result)
- Be warm, encouraging, but professional
- Listen carefully and ask relevant follow-up questions

Interview structure:
1. Start with a warm greeting, introduce yourself as AIR, mention this is a demo interview
2. Ask about their background and interest in the role
3. Ask 2-3 behavioral questions about relevant competencies
4. For each answer, probe deeper if needed (ask for specific examples, outcomes, learnings)
5. Allow time for candidate questions
6. Close with next steps and thanks

COMPETENCIES TO ASSESS:
1. Problem Solving - Ability to analyze complex problems and develop effective solutions
2. Communication - Clear articulation of ideas and active listening
3. Teamwork - Collaboration and working effectively with others

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

This is a DEMO interview to showcase the AI interviewing experience. Keep it friendly and conversational.

Start by greeting ${candidateFirstName}, introducing yourself as AIR, explaining this is a demo interview for the ${jobTitle} role at ${companyName}. Mention the interview will take about ${maxDuration} minutes and ask if they're ready to get started.`

    // Get Deepgram API key from environment
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY

    if (!deepgramApiKey) {
      return NextResponse.json({ error: 'Voice service not configured' }, { status: 503 })
    }

    // Build greeting message for the AI interviewer
    const greeting = `Hello ${candidateFirstName}! I'm AIR, your AI interviewer today. I'll be conducting a demo interview for the ${jobTitle} position at ${companyName}. This interview will take about ${maxDuration} minutes. Before we dive into the questions, could you tell me a little about yourself and what interests you about this role?`

    return NextResponse.json({
      apiKey: deepgramApiKey,
      instructions,
      config: {
        voice: 'aura-2-thalia-en',  // Per Deepgram docs
        thinkModel: 'gpt-4o-mini',  // Per Deepgram docs
        thinkProvider: 'open_ai',  // Per Deepgram docs
        maxDuration,
        language: 'en',
        greeting,  // Initial greeting from the AI interviewer
      },
      interview: {
        jobTitle,
        companyName,
        competencies: ['Problem Solving', 'Communication', 'Teamwork'],
      }
    })
  } catch (error) {
    console.error('Error getting demo voice config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
