import { NextRequest, NextResponse } from 'next/server'
import { generateJuniorDataEngineerPrompt } from '@/lib/prompts/junior-data-engineer.prompt'

// POST /api/interview/demo/voice - Get voice agent configuration for demo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidateFirstName, candidateLastName } = body

    // Demo interview configuration
    const jobTitle = 'Junior Data Engineer'
    const companyName = 'AIBOS'
    const maxDuration = 15

    const instructions = generateJuniorDataEngineerPrompt({
      candidateName: `${candidateFirstName} ${candidateLastName || ''}`.trim(),
      companyName,
      maxDurationMinutes: maxDuration,
      depthLevel: 'moderate'
    })

    // Remove all mentions of "AIR" and "demo" to make it professional
    const professionalInstructions = instructions
      .replace(/AIR \(AI Recruiter\)/g, 'an expert technical interviewer')
      .replace(/I'm AIR, your AI interviewer for today\./g, 'Welcome!')
      .replace(/I'm AIR,/g, "I'm your interviewer,")
      .replace(/\bAIR\b/g, 'the interviewer')
      .replace(/demo interview/gi, 'interview')
      .replace(/this is a demo/gi, 'this is your interview') + `

CRITICAL TIME MANAGEMENT RULES:

You must track elapsed time mentally throughout the interview. For a ${maxDuration} minute interview:

At ~${Math.floor(maxDuration * 0.5)} minutes (50%):
- After the candidate finishes their current response, quickly assess: have you covered at least 2 technical competencies?
- If still on the first topic, say: "That's great context. In the interest of time, let me shift to another area..."
- Then move to the next competency immediately

At ~${Math.floor(maxDuration * 0.75)} minutes (75%):
- After the candidate finishes their current response, begin wrapping up technical questions
- Say something like: "Excellent. We're making good progress. Let me ask one final technical question before we wrap up..."
- Then transition to closing phase

At ~${maxDuration - 2} minutes (2 min remaining):
- After the candidate finishes speaking, say: "We have about 2 minutes left. What questions do you have about the role or ${companyName}?"
- Answer 1-2 candidate questions briefly (30 seconds each max)

At ~${maxDuration - 1} minutes (1 min remaining):
- Politely wrap up any current discussion: "That's a great question. Let me give you a brief answer..."
- Then immediately transition to closing

At ~${maxDuration - 0.5} minutes (30 sec remaining):
- Deliver your closing statement immediately, regardless of what's happening: "Thank you so much for your time today, ${candidateFirstName}. The hiring team will review our conversation and be in touch about next steps. Best of luck!"

NEVER interrupt the candidate mid-sentence. ALWAYS wait for them to finish speaking before transitioning.

Use natural transition phrases:
- "That's really helpful. In the interest of time, let me ask about..."
- "Great. We're being mindful of our time, so let's shift to..."
- "Excellent. Before we run out of time, I want to make sure we cover..."
- "Perfect. We have a few minutes left, so let me ask..."

These transitions should feel conversational, not robotic.`

    // Get Deepgram API key from environment
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY

    if (!deepgramApiKey) {
      return NextResponse.json({ error: 'Voice service not configured' }, { status: 503 })
    }

    // Build greeting message - natural and professional
    // Write AIBOS phonetically as "Eye-Boss" so the TTS pronounces it correctly
    const greeting = `Hi ${candidateFirstName}, hope you're having a great day. Welcome! I'm Lindsey and I'll be conducting your interview for the ${jobTitle} role at Eye-Boss. Thank you for taking the time to speak with me. This is an opportunity for you to showcase your skills and experiences in your own voice. Please ensure you're in a quiet, well-lit place and can dedicate up to ${maxDuration} minutes to this. Can we get started?`

    return NextResponse.json({
      apiKey: deepgramApiKey,
      instructions: professionalInstructions,
      config: {
        voice: 'aura-2-amalthea-en',
        speechSpeed: 1.15,
        thinkModel: 'gpt-4o-mini',
        thinkProvider: 'open_ai',
        maxDuration,
        language: 'en',
        greeting,
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
