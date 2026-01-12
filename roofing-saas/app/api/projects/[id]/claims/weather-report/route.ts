/**
 * Weather Causation Report PDF API
 *
 * GET /api/projects/[id]/claims/weather-report
 * Generate a professional PDF weather causation report for insurance claims
 */

import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from '@pdfme/pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { generateClaimExportPackage } from '@/lib/claims/sync-service'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  hail: 'Hail Storm',
  tornado: 'Tornado',
  thunderstorm_wind: 'Thunderstorm Wind',
  flood: 'Flood',
  other: 'Severe Weather',
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id: projectId } = await params
    const supabase = await createClient()

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Get export package (includes storm causation)
    const exportPackage = await generateClaimExportPackage(supabase, projectId)

    if (!exportPackage) {
      throw InternalError('Failed to generate export data')
    }

    if (!exportPackage.storm_causation || exportPackage.storm_causation.events.length === 0) {
      throw NotFoundError('No storm causation data available for this project')
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageWidth = 612 // Letter width in points
    const pageHeight = 792 // Letter height in points
    const margin = 50
    const fontSize = 10
    const lineHeight = 14

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let yPosition = pageHeight - margin

    // Helper to add new page if needed
    const checkNewPage = () => {
      if (yPosition < margin + 50) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        yPosition = pageHeight - margin
      }
    }

    // Helper to wrap text
    const wrapText = (text: string, maxWidth: number): string[] => {
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        lines.push(currentLine)
      }
      return lines
    }

    // ===== HEADER =====
    page.drawText('WEATHER CAUSATION REPORT', {
      x: margin,
      y: yPosition,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    yPosition -= 25

    page.drawText('Insurance Documentation', {
      x: margin,
      y: yPosition,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    yPosition -= 30

    // Draw header line
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 2,
      color: rgb(0, 0.4, 0.6),
    })
    yPosition -= 25

    // ===== PROPERTY INFORMATION =====
    page.drawText('PROPERTY INFORMATION', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.3, 0.5),
    })
    yPosition -= 18

    const contact = exportPackage.contact

    page.drawText(`Property Owner: ${contact.first_name} ${contact.last_name}`, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    if (contact.address) {
      page.drawText(`Address: ${contact.address}`, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight
    }

    if (contact.city || contact.state || contact.zip) {
      page.drawText(`Location: ${[contact.city, contact.state, contact.zip].filter(Boolean).join(', ')}`, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight
    }

    if (contact.insurance_carrier) {
      page.drawText(`Insurance Carrier: ${contact.insurance_carrier}`, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight
    }

    if (contact.policy_number) {
      page.drawText(`Policy Number: ${contact.policy_number}`, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight
    }

    yPosition -= 15

    // ===== EVIDENCE SCORE =====
    const causation = exportPackage.storm_causation
    const scoreColor = causation.evidence_score >= 70
      ? rgb(0, 0.5, 0)
      : causation.evidence_score >= 50
        ? rgb(0.7, 0.5, 0)
        : rgb(0.7, 0, 0)

    page.drawText('EVIDENCE SCORE', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.3, 0.5),
    })
    yPosition -= 20

    // Score box
    page.drawRectangle({
      x: margin,
      y: yPosition - 30,
      width: 80,
      height: 35,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: scoreColor,
      borderWidth: 2,
    })

    page.drawText(`${causation.evidence_score}%`, {
      x: margin + 15,
      y: yPosition - 20,
      size: 20,
      font: fontBold,
      color: scoreColor,
    })

    // Score label
    const scoreLabel = causation.evidence_score >= 70
      ? 'Strong Evidence'
      : causation.evidence_score >= 50
        ? 'Moderate Evidence'
        : 'Limited Evidence'

    page.drawText(scoreLabel, {
      x: margin + 95,
      y: yPosition - 15,
      size: 12,
      font: fontBold,
      color: scoreColor,
    })

    page.drawText('Weather documentation supports insurance claim', {
      x: margin + 95,
      y: yPosition - 28,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })

    yPosition -= 55

    // ===== STORM EVENTS =====
    checkNewPage()
    page.drawText('DOCUMENTED STORM EVENTS', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.3, 0.5),
    })
    yPosition -= 18

    for (const event of causation.events.slice(0, 5)) {
      checkNewPage()

      // Event type and magnitude
      const eventLabel = EVENT_TYPE_LABELS[event.event_type] || 'Storm Event'
      let magnitudeStr = ''
      if (event.magnitude) {
        if (event.event_type === 'hail') {
          magnitudeStr = ` - ${event.magnitude}" hail`
        } else if (event.event_type === 'thunderstorm_wind') {
          magnitudeStr = ` - ${event.magnitude} mph winds`
        }
      }

      page.drawText(`• ${eventLabel}${magnitudeStr}`, {
        x: margin + 10,
        y: yPosition,
        size: fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight

      // Event date
      const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      page.drawText(`  Date: ${eventDate}`, {
        x: margin + 10,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      })
      yPosition -= lineHeight

      // Distance
      if (event.distance_miles !== undefined) {
        page.drawText(`  Distance from property: ${event.distance_miles.toFixed(1)} miles`, {
          x: margin + 10,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        })
        yPosition -= lineHeight
      }

      yPosition -= 5
    }

    if (causation.events.length > 5) {
      page.drawText(`  ... and ${causation.events.length - 5} additional storm events`, {
        x: margin + 10,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPosition -= lineHeight
    }

    yPosition -= 15

    // ===== CAUSATION NARRATIVE =====
    checkNewPage()
    page.drawText('CAUSATION NARRATIVE', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.3, 0.5),
    })
    yPosition -= 18

    // Draw narrative box
    const narrativeLines = wrapText(causation.causation_narrative, pageWidth - margin * 2 - 20)
    const narrativeBoxHeight = Math.min(narrativeLines.length * lineHeight + 20, 200)

    page.drawRectangle({
      x: margin,
      y: yPosition - narrativeBoxHeight,
      width: pageWidth - margin * 2,
      height: narrativeBoxHeight,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    })

    yPosition -= 15
    for (const line of narrativeLines) {
      checkNewPage()
      page.drawText(line, {
        x: margin + 10,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
      yPosition -= lineHeight
    }

    yPosition -= 25

    // ===== DATA SOURCES =====
    checkNewPage()
    page.drawText('DATA SOURCES', {
      x: margin,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0, 0.3, 0.5),
    })
    yPosition -= 18

    page.drawText('• NOAA Storm Events Database - https://www.ncdc.noaa.gov/stormevents/', {
      x: margin + 10,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
    yPosition -= lineHeight

    page.drawText('• National Weather Service - https://www.weather.gov/', {
      x: margin + 10,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
    yPosition -= lineHeight * 2

    // ===== FOOTER =====
    checkNewPage()
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    })
    yPosition -= 15

    page.drawText(`Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`, {
      x: margin,
      y: yPosition,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })

    page.drawText('This report is generated from official NOAA weather data for insurance documentation purposes.', {
      x: margin,
      y: yPosition - 12,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    logger.info('Weather report PDF generated', {
      projectId,
      eventCount: causation.events.length,
      evidenceScore: causation.evidence_score,
    })

    // Return PDF as download
    const contactName = `${contact.first_name}-${contact.last_name}`.replace(/\s+/g, '-')
    const filename = `weather-report-${contactName}-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error('Error generating weather report PDF:', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to generate weather report'))
  }
}
