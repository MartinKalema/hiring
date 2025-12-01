import { createClient, DeepgramError } from '@deepgram/sdk'
import { NextResponse } from 'next/server'

export async function POST() {
  // Use the provided API key directly (same as working demo with API_KEY_STRATEGY=provided)
  if (process.env.API_KEY_STRATEGY === 'provided') {
    return NextResponse.json(
      process.env.DEEPGRAM_API_KEY
        ? { key: process.env.DEEPGRAM_API_KEY, access_token: process.env.DEEPGRAM_API_KEY }
        : new DeepgramError("Can't do local development without setting a DEEPGRAM_API_KEY environment variable.")
    )
  }

  // Otherwise, generate a temporary token (for production)
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY ?? '')
  const { result: token, error: tokenError } = await deepgram.auth.grantToken()

  if (tokenError) {
    return NextResponse.json(tokenError, { status: 500 })
  }

  return NextResponse.json({ ...token })
}
