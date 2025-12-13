import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateVCard } from '@/lib/digital-cards/vcard'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Fetch card (public access - no auth required)
    const { data: card, error } = await supabase
      .from('digital_business_cards')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !card) {
      throw NotFoundError('Card not found')
    }

    // Generate vCard
    const vcard = generateVCard({
      firstName: card.full_name.split(' ')[0] || '',
      lastName: card.full_name.split(' ').slice(1).join(' ') || '',
      fullName: card.full_name,
      title: card.job_title || undefined,
      organization: card.company_name || undefined,
      email: card.email || undefined,
      phone: card.phone || undefined,
      website: card.company_website || undefined,
      address: card.company_address || undefined,
      photo: card.profile_photo_url || undefined,
      note: card.bio || undefined,
      socialProfiles: {
        linkedin: card.linkedin_url || undefined,
        facebook: card.facebook_url || undefined,
        instagram: card.instagram_url || undefined,
        twitter: card.twitter_url || undefined,
      },
    })

    return new NextResponse(vcard, {
      headers: {
        'Content-Type': 'text/vcard',
        'Content-Disposition': `attachment; filename="${card.slug}.vcf"`,
      },
    })
  } catch (error) {
    logger.error('Error generating vCard:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
