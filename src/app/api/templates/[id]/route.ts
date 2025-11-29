import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/database'

// GET /api/templates/[id] - Get a single template
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

    const { data: template, error } = await db
      .from('interview_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Fetch recent sessions for this template
    const { data: sessions } = await db
      .from('interview_sessions')
      .select(`
        *,
        candidates (
          first_name,
          last_name,
          email
        )
      `)
      .eq('template_id', id)
      .order('invited_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ ...template, sessions: sessions || [] })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/templates/[id] - Update a template
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

    // Verify template belongs to organization
    const { data: existing } = await db
      .from('interview_templates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name) updateData.name = body.name
    if (body.jobTitle) updateData.job_title = body.jobTitle
    if (body.jobDescription) updateData.job_description = body.jobDescription
    if (body.companyName) updateData.company_name = body.companyName
    if (body.competenciesToAssess) updateData.competencies_to_assess = body.competenciesToAssess
    if (body.mustAskQuestions) updateData.must_ask_questions = body.mustAskQuestions
    if (body.config) updateData.config = body.config
    if (body.status) updateData.status = body.status

    const { data: template, error } = await db
      .from('interview_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/templates/[id] - Delete a template
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

    // Verify template belongs to organization
    const { data: existing } = await db
      .from('interview_templates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if there are any sessions
    const { count: sessionCount } = await db
      .from('interview_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id)

    if (sessionCount && sessionCount > 0) {
      // Soft delete by archiving
      await db
        .from('interview_templates')
        .update({ status: 'archived' })
        .eq('id', id)
      return NextResponse.json({ message: 'Template archived (has existing sessions)' })
    }

    // Hard delete if no sessions
    const { error } = await db
      .from('interview_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Template deleted' })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
