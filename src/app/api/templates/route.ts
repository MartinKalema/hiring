import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/database'

// GET /api/templates - List all templates for the organization
export async function GET() {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: templates, error } = await db
      .from('interview_templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      jobTitle,
      jobDescription,
      companyName,
      competenciesToAssess = [],
      mustAskQuestions = [],
      config = {},
      jobRequisitionId,
    } = body

    // Validate required fields
    if (!name || !jobTitle || !jobDescription || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: name, jobTitle, jobDescription, companyName' },
        { status: 400 }
      )
    }

    // Merge with default config
    const defaultConfig = {
      maxDurationMinutes: 9,
      depthLevel: 'standard',
      maxProbesPerCompetency: 2,
      aiVoice: 'aura-asteria-en',
      language: 'en-US',
      videoRequired: true,
    }

    const { data: template, error } = await db
      .from('interview_templates')
      .insert({
        organization_id: orgId,
        created_by: userId,
        name,
        job_title: jobTitle,
        job_description: jobDescription,
        company_name: companyName,
        competencies_to_assess: competenciesToAssess,
        must_ask_questions: mustAskQuestions,
        config: { ...defaultConfig, ...config },
        job_requisition_id: jobRequisitionId,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
