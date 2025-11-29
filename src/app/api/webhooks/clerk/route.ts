import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { db } from '@/lib/database'

interface OrganizationWebhookEvent {
  type: string
  data: {
    id: string
    name: string
    slug?: string
    created_at?: number
    updated_at?: number
  }
}

export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // Get body
  const payload = await request.json()
  const body = JSON.stringify(payload)

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: OrganizationWebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as OrganizationWebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle organization events
  const eventType = evt.type

  try {
    if (eventType === 'organization.created') {
      const { error } = await db
        .from('organizations')
        .insert({
          id: evt.data.id,
          name: evt.data.name,
        })

      if (error) {
        console.error('Error creating organization:', error)
      } else {
        console.log(`Organization created: ${evt.data.id}`)
      }
    }

    if (eventType === 'organization.updated') {
      const { error } = await db
        .from('organizations')
        .upsert({
          id: evt.data.id,
          name: evt.data.name,
        })

      if (error) {
        console.error('Error updating organization:', error)
      } else {
        console.log(`Organization updated: ${evt.data.id}`)
      }
    }

    if (eventType === 'organization.deleted') {
      // Soft delete - we don't actually delete to preserve data
      // In production, you might want to handle this differently
      console.log(`Organization deletion requested: ${evt.data.id}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 })
  }
}
