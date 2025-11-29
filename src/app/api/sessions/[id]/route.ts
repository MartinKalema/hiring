import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/database'

// GET /api/sessions/[id] - Get a single session
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

    // Get the session with related data
    const { data: session, error } = await db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates!inner (
          *,
          organization_id
        ),
        candidates (
          *
        ),
        interview_summaries (
          *
        )
      `)
      .eq('id', id)
      .eq('interview_templates.organization_id', orgId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/sessions/[id] - Update a session
export async function PATCH(
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
    const { data: existing } = await db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates!inner (
          organization_id
        )
      `)
      .eq('id', id)
      .eq('interview_templates.organization_id', orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.competencyCoverage !== undefined) updateData.competency_coverage = body.competencyCoverage
    if (body.currentCompetencyIndex !== undefined) updateData.current_competency_index = body.currentCompetencyIndex
    if (body.conversationHistory !== undefined) updateData.conversation_history = body.conversationHistory
    if (body.metrics !== undefined) updateData.metrics = body.metrics
    if (body.videoUrl !== undefined) updateData.video_url = body.videoUrl
    if (body.audioUrl !== undefined) updateData.audio_url = body.audioUrl
    if (body.fullTranscript !== undefined) updateData.full_transcript = body.fullTranscript

    // Handle status transitions
    if (body.status === 'started' && !existing.started_at) {
      updateData.started_at = new Date().toISOString()
    }
    if (body.status === 'completed' && !existing.completed_at) {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: session, error } = await db
      .from('interview_sessions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        interview_templates (
          *
        ),
        candidates (
          *
        ),
        interview_summaries (
          *
        )
      `)
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/sessions/[id] - Delete a session
export async function DELETE(
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
    const { data: existing } = await db
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

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { error } = await db
      .from('interview_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting session:', error)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Session deleted' })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
