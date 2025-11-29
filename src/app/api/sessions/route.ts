import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/database'
import { randomBytes } from 'crypto'

// GET /api/sessions - List all sessions (with filters)
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const templateId = searchParams.get('templateId')
    const status = searchParams.get('status')

    // Get templates for this organization first to filter sessions
    const { data: templates } = await db
      .from('interview_templates')
      .select('id')
      .eq('organization_id', orgId)

    if (!templates || templates.length === 0) {
      return NextResponse.json([])
    }

    const templateIds = templates.map(t => t.id)

    let query = db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates (
          name,
          job_title,
          company_name
        ),
        candidates (
          first_name,
          last_name,
          email
        ),
        interview_summaries (
          recommendation,
          recommendation_confidence
        )
      `)
      .in('template_id', templateIds)
      .order('invited_at', { ascending: false })

    if (templateId) {
      query = query.eq('template_id', templateId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sessions - Create a new session (invite a candidate)
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      templateId,
      candidateId,
      candidateEmail,
      candidateFirstName,
      candidateLastName,
      candidatePhone,
      expiresInDays = 7,
    } = body

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    }

    // Verify template belongs to organization
    const { data: template, error: templateError } = await db
      .from('interview_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', orgId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Handle candidate - either use existing or create new
    let finalCandidateId = candidateId

    if (!candidateId && candidateEmail) {
      // Check if candidate exists
      const { data: existingCandidate } = await db
        .from('candidates')
        .select('id')
        .eq('organization_id', orgId)
        .eq('email', candidateEmail)
        .single()

      if (existingCandidate) {
        finalCandidateId = existingCandidate.id
      } else {
        // Create new candidate
        if (!candidateFirstName || !candidateLastName) {
          return NextResponse.json(
            { error: 'candidateFirstName and candidateLastName required for new candidates' },
            { status: 400 }
          )
        }

        const { data: newCandidate, error: candidateError } = await db
          .from('candidates')
          .insert({
            organization_id: orgId,
            first_name: candidateFirstName,
            last_name: candidateLastName,
            email: candidateEmail,
            phone: candidatePhone,
          })
          .select()
          .single()

        if (candidateError || !newCandidate) {
          console.error('Error creating candidate:', candidateError)
          return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
        }

        finalCandidateId = newCandidate.id
      }
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex')

    // Calculate expiry
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Initialize competency coverage based on template
    const competencies = (template.competencies_to_assess as Array<{
      name: string
      description: string
      weight: number
      requiredLevel: string
    }>) || []

    const competencyCoverage = competencies.map(c => ({
      competencyName: c.name,
      questionsAsked: 0,
      probesUsed: 0,
      responseQuality: null,
      covered: false,
    }))

    const { data: session, error: sessionError } = await db
      .from('interview_sessions')
      .insert({
        template_id: templateId,
        candidate_id: finalCandidateId,
        token,
        status: 'invited',
        competency_coverage: competencyCoverage,
        current_competency_index: 0,
        conversation_history: [],
        metrics: {
          totalDurationMs: 0,
          candidateSpeakingTimeMs: 0,
          aiSpeakingTimeMs: 0,
          turnCount: 0,
        },
        expires_at: expiresAt.toISOString(),
      })
      .select(`
        *,
        candidates (
          first_name,
          last_name,
          email
        ),
        interview_templates (
          name,
          job_title,
          company_name
        )
      `)
      .single()

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Generate interview link
    const interviewLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview/${token}`

    return NextResponse.json({
      ...session,
      interviewLink,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
