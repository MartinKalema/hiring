import { NextRequest, NextResponse } from 'next/server'

// GET /api/location - Get user's location based on IP
export async function GET(request: NextRequest) {
  try {
    // Get client IP from request headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

    // Use ipapi.co to get location details
    // Note: This is a free service with rate limits (1000 requests/day)
    const response = await fetch('https://ipapi.co/json/')

    if (!response.ok) {
      throw new Error('Failed to fetch location')
    }

    const data = await response.json()

    return NextResponse.json({
      city: data.city || 'Unknown',
      country: data.country_name || 'Unknown',
      ip: ip
    })
  } catch (error) {
    console.error('Error fetching location:', error)

    // Return default values on error
    return NextResponse.json({
      city: 'Unknown',
      country: 'Unknown',
      ip: 'Unknown'
    })
  }
}
