import { NextResponse } from 'next/server'

// GET /api/location - Get user's location using Cloudflare trace (100% reliable, no CORS)
export async function GET() {
  try {
    // Use Cloudflare's free trace API - always works, no rate limits
    const response = await fetch('https://1.1.1.1/cdn-cgi/trace')

    if (!response.ok) {
      throw new Error('Failed to fetch trace')
    }

    const text = await response.text()

    // Parse the trace format (key=value pairs)
    const data: Record<string, string> = {}
    text.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        data[key] = value
      }
    })

    // Cloudflare trace gives us country code (loc=US) but not city
    // For city, we'll use ip-api.com as fallback
    let city = 'Unknown'

    if (data.ip) {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${data.ip}?fields=city`)
        if (geoResponse.ok) {
          const geoData = await geoResponse.json()
          city = geoData.city || 'Unknown'
        }
      } catch {
        // Ignore city lookup errors
      }
    }

    return NextResponse.json({
      city: city,
      country: data.loc || 'Unknown', // 2-letter country code
      ip: data.ip || 'Unknown'
    })
  } catch (error) {
    console.error('Error fetching location:', error)

    // Return defaults on error - don't break the user experience
    return NextResponse.json({
      city: 'Unknown',
      country: 'Unknown',
      ip: 'Unknown'
    })
  }
}
