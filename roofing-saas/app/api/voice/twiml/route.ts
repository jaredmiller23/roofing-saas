import { NextRequest, NextResponse } from 'next/server'
import { generateSimpleTwiML } from '@/lib/twilio/voice'
import { logger } from '@/lib/logger'

/**
 * POST /api/voice/twiml
 * GET /api/voice/twiml
 * Return TwiML instructions for Twilio voice calls
 */
export async function GET(request: NextRequest) {
  return handleTwiMLRequest(request)
}

export async function POST(request: NextRequest) {
  return handleTwiMLRequest(request)
}

async function handleTwiMLRequest(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const message = searchParams.get('message')

    logger.info('TwiML request received', {
      message: message ? 'Custom message' : 'Default message',
      url: request.url,
    })

    // Generate TwiML response
    const twiml = generateSimpleTwiML(message || undefined)

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  } catch (error) {
    logger.error('TwiML generation error', { error })

    // Return a fallback TwiML response
    const fallbackTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're sorry, but we're unable to connect your call at this time.</Say>
  <Hangup/>
</Response>`

    return new NextResponse(fallbackTwiML, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }
}
