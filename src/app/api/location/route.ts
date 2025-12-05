import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')

    const clientIp = cfConnectingIp || (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || 'unknown'

    console.log('Client IP:', clientIp, 'Headers:', {
      forwarded,
      realIp,
      cfConnectingIp
    })

    if (!clientIp || clientIp === 'unknown') {
      const response = await fetch('http://ip-api.com/json/?fields=status,country,city,query')
      const data = await response.json()

      return NextResponse.json({
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        ip: data.query || 'Unknown'
      })
    }

    const response = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city,query`)

    if (!response.ok) {
      throw new Error('IP API failed')
    }

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error('IP lookup failed')
    }

    return NextResponse.json({
      city: data.city || 'Unknown',
      country: data.country || 'Unknown',
      ip: data.query || clientIp
    })
  } catch (error) {
    console.error('Location error:', error)

    return NextResponse.json({
      city: 'Unknown',
      country: 'Unknown',
      ip: 'Unknown'
    })
  }
}

