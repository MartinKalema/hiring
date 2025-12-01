import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    let query = db
      .from('candidates')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: candidates, error } = await query

    if (error) {
      console.error('Error fetching candidates:', error)
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
    }

    return NextResponse.json(candidates)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      resumeUrl,
      linkedinUrl,
      metadata = {},
    } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email' },
        { status: 400 }
      )
    }

    const { data: existing } = await db
      .from('candidates')
      .select('id')
      .eq('organization_id', orgId)
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Candidate with this email already exists' },
        { status: 409 }
      )
    }

    const { data: candidate, error } = await db
      .from('candidates')
      .insert({
        organization_id: orgId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        resume_url: resumeUrl,
        linkedin_url: linkedinUrl,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating candidate:', error)
      return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
    }

    return NextResponse.json(candidate, { status: 201 })
  } catch (error) {
    console.error('Error creating candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
