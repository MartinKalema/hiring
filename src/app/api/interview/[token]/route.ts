import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const { data: session, error } = await db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates (
          name,
          job_title,
          company_name,
          job_description,
          competencies_to_assess,
          config
        ),
        candidates (
          first_name,
          last_name,
          email
        )
      `)
      .eq('token', token)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (new Date() > new Date(session.expires_at)) {
      if (session.status === 'invited') {
        await db
          .from('interview_sessions')
          .update({ status: 'expired' })
          .eq('token', token)
      }
      return NextResponse.json({ error: 'Interview link has expired' }, { status: 410 })
    }

    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 410 })
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      template: session.interview_templates,
      candidate: session.candidates,
      expiresAt: session.expires_at,
    })
  } catch (error) {
    console.error('Error fetching interview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action, conversationTurn, metrics } = body

    const { data: session, error: sessionError } = await db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates (*)
      `)
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (new Date() > new Date(session.expires_at)) {
      return NextResponse.json({ error: 'Interview link has expired' }, { status: 410 })
    }

    if (action === 'start') {
      const { data: updated, error } = await db
        .from('interview_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('token', token)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to start interview' }, { status: 500 })
      }

      return NextResponse.json({
        status: updated.status,
        startedAt: updated.started_at,
      })
    }

    if (action === 'turn' && conversationTurn) {
      const currentHistory = (session.conversation_history as Array<Record<string, unknown>>) || []

      const { data: updated, error } = await db
        .from('interview_sessions')
        .update({
          conversation_history: [...currentHistory, conversationTurn],
          ...(metrics && { metrics }),
        })
        .eq('token', token)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to add turn' }, { status: 500 })
      }

      return NextResponse.json({
        conversationHistory: updated.conversation_history,
        metrics: updated.metrics,
      })
    }

    if (action === 'complete') {
      // Mark session as completed
      const currentHistory = (session.conversation_history as Array<Record<string, unknown>>) || []

      // Build full transcript
      const fullTranscript = currentHistory
        .map(turn => `${(turn.role as string).toUpperCase()}: ${turn.content}`)
        .join('\n\n')

      const { data: updated, error } = await db
        .from('interview_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          full_transcript: fullTranscript,
          ...(metrics && { metrics }),
        })
        .eq('token', token)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to complete interview' }, { status: 500 })
      }

      return NextResponse.json({
        status: updated.status,
        completedAt: updated.completed_at,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating interview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
