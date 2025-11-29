import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/database'

// GET /api/candidates/[id] - Get a single candidate
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

    const { data: candidate, error } = await db
      .from('candidates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Fetch sessions for this candidate
    const { data: sessions } = await db
      .from('interview_sessions')
      .select(`
        *,
        interview_templates (
          name,
          job_title
        ),
        interview_summaries (
          recommendation,
          recommendation_confidence
        )
      `)
      .eq('candidate_id', id)
      .order('invited_at', { ascending: false })

    return NextResponse.json({ ...candidate, sessions: sessions || [] })
  } catch (error) {
    console.error('Error fetching candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/candidates/[id] - Update a candidate
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

    // Verify candidate belongs to organization
    const { data: existing } = await db
      .from('candidates')
      .select('id, email')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.firstName) updateData.first_name = body.firstName
    if (body.lastName) updateData.last_name = body.lastName
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.resumeUrl !== undefined) updateData.resume_url = body.resumeUrl
    if (body.linkedinUrl !== undefined) updateData.linkedin_url = body.linkedinUrl
    if (body.metadata) updateData.metadata = body.metadata

    // Check email uniqueness if changing
    if (body.email && body.email !== existing.email) {
      const { data: emailExists } = await db
        .from('candidates')
        .select('id')
        .eq('organization_id', orgId)
        .eq('email', body.email)
        .single()

      if (emailExists) {
        return NextResponse.json(
          { error: 'Another candidate with this email already exists' },
          { status: 409 }
        )
      }
      updateData.email = body.email
    }

    const { data: candidate, error } = await db
      .from('candidates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating candidate:', error)
      return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 })
    }

    return NextResponse.json(candidate)
  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/candidates/[id] - Delete a candidate
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

    // Verify candidate belongs to organization
    const { data: existing } = await db
      .from('candidates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Check if there are any sessions
    const { count: sessionCount } = await db
      .from('interview_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', id)

    if (sessionCount && sessionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete candidate with existing interview sessions' },
        { status: 400 }
      )
    }

    const { error } = await db
      .from('candidates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting candidate:', error)
      return NextResponse.json({ error: 'Failed to delete candidate' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Candidate deleted' })
  } catch (error) {
    console.error('Error deleting candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
