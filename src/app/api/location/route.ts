import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://1.1.1.1/cdn-cgi/trace')

    if (!response.ok) {
      throw new Error('Failed to fetch trace')
    }

    const text = await response.text()

    const data: Record<string, string> = {}
    text.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        data[key] = value
      }
    })

    let city = 'Unknown'

    if (data.ip) {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${data.ip}?fields=city`)
        if (geoResponse.ok) {
          const geoData = await geoResponse.json()
          city = geoData.city || 'Unknown'
        }
      } catch {
        city = 'Unknown'
      }
    }

    return NextResponse.json({
      city: city,
      country: data.loc || 'Unknown',
      ip: data.ip || 'Unknown'
    })
  } catch (error) {
    console.error('Error fetching location:', error)

    return NextResponse.json({
      city: 'Unknown',
      country: 'Unknown',
      ip: 'Unknown'
    })
  }
}

