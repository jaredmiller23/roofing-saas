/**
 * THE PACKET - PDF Generation API
 *
 * GET /api/projects/[id]/claims/packet/pdf - Generate PDF from latest packet
 *
 * Generates a professional claims documentation PDF containing:
 * - Executive summary
 * - Property information
 * - Damage documentation
 * - Weather causation
 * - Building codes
 * - Manufacturer specifications
 * - Policy provisions
 * - Recommended action with justification
 * - Xactimate punch list
 */

import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, PDFPage } from '@pdfme/pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import type { ClaimsPacket } from '@/lib/packet/types'

// PDF constants
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const FONT_SIZE = 10
const HEADER_SIZE = 14
const TITLE_SIZE = 18
const LINE_HEIGHT = 14

// Colors
const PRIMARY_COLOR = rgb(0, 0.3, 0.5)
const TEXT_COLOR = rgb(0, 0, 0)
const MUTED_COLOR = rgb(0.4, 0.4, 0.4)
const SUCCESS_COLOR = rgb(0, 0.5, 0)
const WARNING_COLOR = rgb(0.7, 0.5, 0)
const BORDER_COLOR = rgb(0.8, 0.8, 0.8)

export const GET = withAuthParams(async (_request, _auth, { params }) => {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()

    // Get latest packet for this project
    const { data: packetRecord, error: packetError } = await supabase
      .from('packets')
      .select('*')
      .eq('project_id', projectId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (packetError) {
      throw InternalError('Failed to fetch packet')
    }

    if (!packetRecord) {
      throw NotFoundError('No packet has been generated for this project. Generate a packet first.')
    }

    const packet = packetRecord.packet_data as unknown as ClaimsPacket

    // Generate PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    let yPosition = PAGE_HEIGHT - MARGIN

    // Helper functions
    const checkNewPage = (): PDFPage => {
      if (yPosition < MARGIN + 80) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        yPosition = PAGE_HEIGHT - MARGIN
      }
      return page
    }

    const wrapText = (text: string, maxWidth: number, fontSize: number = FONT_SIZE): string[] => {
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

    const drawSection = (title: string) => {
      checkNewPage()
      yPosition -= 10
      page.drawText(title, {
        x: MARGIN,
        y: yPosition,
        size: HEADER_SIZE,
        font: fontBold,
        color: PRIMARY_COLOR,
      })
      yPosition -= 20
    }

    const drawLine = (text: string, bold: boolean = false, indent: number = 0) => {
      checkNewPage()
      const lines = wrapText(text, PAGE_WIDTH - MARGIN * 2 - indent)
      for (const line of lines) {
        page.drawText(line, {
          x: MARGIN + indent,
          y: yPosition,
          size: FONT_SIZE,
          font: bold ? fontBold : font,
          color: TEXT_COLOR,
        })
        yPosition -= LINE_HEIGHT
      }
    }

    const drawMutedLine = (text: string, indent: number = 0) => {
      checkNewPage()
      page.drawText(text, {
        x: MARGIN + indent,
        y: yPosition,
        size: FONT_SIZE,
        font,
        color: MUTED_COLOR,
      })
      yPosition -= LINE_HEIGHT
    }

    // ===== COVER PAGE =====
    page.drawText('CLAIMS DOCUMENTATION PACKET', {
      x: MARGIN,
      y: yPosition,
      size: TITLE_SIZE,
      font: fontBold,
      color: TEXT_COLOR,
    })
    yPosition -= 30

    page.drawText('Comprehensive Insurance Claim Support Package', {
      x: MARGIN,
      y: yPosition,
      size: 12,
      font,
      color: MUTED_COLOR,
    })
    yPosition -= 40

    // Header line
    page.drawLine({
      start: { x: MARGIN, y: yPosition },
      end: { x: PAGE_WIDTH - MARGIN, y: yPosition },
      thickness: 2,
      color: PRIMARY_COLOR,
    })
    yPosition -= 30

    // ===== EXECUTIVE SUMMARY =====
    drawSection('EXECUTIVE SUMMARY')

    drawLine(`Loss Date: ${new Date(packet.summary.loss_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`)
    drawLine(`Claim Type: ${packet.summary.claim_type.charAt(0).toUpperCase() + packet.summary.claim_type.slice(1)}`)
    yPosition -= 5

    // Recommended action box
    const actionColor = packet.summary.recommended_action === 'full_replacement'
      ? WARNING_COLOR
      : packet.summary.recommended_action === 'repair'
        ? SUCCESS_COLOR
        : rgb(0.3, 0.3, 0.7)

    const actionLabel = packet.summary.recommended_action.replace(/_/g, ' ').toUpperCase()

    page.drawRectangle({
      x: MARGIN,
      y: yPosition - 35,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 40,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: actionColor,
      borderWidth: 2,
    })

    page.drawText(`RECOMMENDED ACTION: ${actionLabel}`, {
      x: MARGIN + 10,
      y: yPosition - 18,
      size: 12,
      font: fontBold,
      color: actionColor,
    })

    yPosition -= 50

    if (packet.summary.replacement_justification) {
      drawLine(`Justification: ${packet.summary.replacement_justification}`)
    }

    yPosition -= 10

    // ===== PROPERTY INFORMATION =====
    drawSection('PROPERTY INFORMATION')

    drawLine(`Owner: ${packet.contact.first_name} ${packet.contact.last_name}`)
    drawLine(`Address: ${packet.property.address}`)
    drawLine(`Location: ${packet.property.city}, ${packet.property.state} ${packet.property.zip}`)

    if (packet.contact.insurance_carrier) {
      drawLine(`Insurance Carrier: ${packet.contact.insurance_carrier}`)
    }
    if (packet.contact.policy_number) {
      drawLine(`Policy Number: ${packet.contact.policy_number}`)
    }
    if (packet.property.roof_manufacturer) {
      drawLine(`Roof Material: ${packet.property.roof_manufacturer} ${packet.property.roof_material || ''}`)
    }
    if (packet.property.roof_age_years) {
      drawLine(`Roof Age: ${packet.property.roof_age_years} years`)
    }

    // ===== DAMAGE DOCUMENTATION =====
    drawSection('DAMAGE DOCUMENTATION')

    drawLine(packet.damage.damage_summary)
    yPosition -= 5

    if (packet.damage.affected_areas.length > 0) {
      drawLine(`Affected Areas: ${packet.damage.affected_areas.join(', ')}`)
    }
    if (packet.damage.hail_hits_per_square) {
      drawLine(`Test Square: ${packet.damage.hail_hits_per_square} hits per square`)
    }
    drawMutedLine(`Photo Documentation: ${packet.damage.photos.length} photos attached`)

    // ===== WEATHER CAUSATION =====
    if (packet.weather_causation && packet.weather_causation.events.length > 0) {
      drawSection('WEATHER CAUSATION')

      // Evidence score
      const scoreColor = packet.weather_causation.evidence_score >= 70 ? SUCCESS_COLOR : WARNING_COLOR
      page.drawText(`Evidence Score: ${packet.weather_causation.evidence_score}%`, {
        x: MARGIN,
        y: yPosition,
        size: 12,
        font: fontBold,
        color: scoreColor,
      })
      yPosition -= 20

      for (const event of packet.weather_causation.events.slice(0, 3)) {
        const eventDate = new Date(event.event_date).toLocaleDateString('en-US')
        const magnitude = event.magnitude ? ` (${event.magnitude}${event.event_type === 'hail' ? '"' : ' mph'})` : ''
        drawLine(`• ${event.event_type}${magnitude} - ${eventDate}`, false, 10)
        if (event.distance_miles !== undefined) {
          drawMutedLine(`  Distance: ${event.distance_miles.toFixed(1)} miles from property`, 10)
        }
      }

      if (packet.weather_causation.causation_narrative) {
        yPosition -= 5
        const narrativeLines = wrapText(packet.weather_causation.causation_narrative, PAGE_WIDTH - MARGIN * 2 - 20)
        for (const line of narrativeLines.slice(0, 5)) {
          checkNewPage()
          page.drawText(line, {
            x: MARGIN + 10,
            y: yPosition,
            size: FONT_SIZE,
            font,
            color: TEXT_COLOR,
          })
          yPosition -= LINE_HEIGHT
        }
      }
    }

    // ===== BUILDING CODES =====
    if (packet.applicable_codes.length > 0) {
      checkNewPage()
      drawSection('APPLICABLE BUILDING CODES')

      drawMutedLine(`${packet.applicable_codes.length} applicable code sections identified`)
      yPosition -= 5

      for (const code of packet.applicable_codes.slice(0, 5)) {
        checkNewPage()
        drawLine(`${code.code_section} - ${code.code_title}`, true)

        // Truncate code text for PDF
        const truncatedText = code.code_text.length > 200
          ? code.code_text.substring(0, 200) + '...'
          : code.code_text

        const codeLines = wrapText(truncatedText, PAGE_WIDTH - MARGIN * 2 - 20)
        for (const line of codeLines.slice(0, 3)) {
          drawMutedLine(line, 10)
        }
        yPosition -= 5
      }

      if (packet.applicable_codes.length > 5) {
        drawMutedLine(`... and ${packet.applicable_codes.length - 5} additional code sections`)
      }
    }

    // ===== MANUFACTURER SPECIFICATIONS =====
    if (packet.manufacturer_specs.length > 0) {
      checkNewPage()
      drawSection('MANUFACTURER SPECIFICATIONS')

      for (const spec of packet.manufacturer_specs.slice(0, 3)) {
        checkNewPage()
        drawLine(`${spec.manufacturer} - ${spec.product_name}`, true)

        if (spec.matching_policy) {
          const policyLines = wrapText(`Matching Policy: ${spec.matching_policy}`, PAGE_WIDTH - MARGIN * 2 - 20)
          for (const line of policyLines.slice(0, 2)) {
            drawMutedLine(line, 10)
          }
        }
        yPosition -= 5
      }
    }

    // ===== DISCONTINUED SHINGLE ANALYSIS =====
    if (packet.shingle_analysis?.is_discontinued) {
      checkNewPage()
      drawSection('DISCONTINUED MATERIAL NOTICE')

      page.drawRectangle({
        x: MARGIN,
        y: yPosition - 60,
        width: PAGE_WIDTH - MARGIN * 2,
        height: 65,
        color: rgb(1, 0.95, 0.9),
        borderColor: WARNING_COLOR,
        borderWidth: 2,
      })

      page.drawText('MATERIAL DISCONTINUED - REPLACEMENT REQUIRED', {
        x: MARGIN + 10,
        y: yPosition - 18,
        size: 12,
        font: fontBold,
        color: WARNING_COLOR,
      })

      if (packet.shingle_analysis.replacement_required_reason) {
        const reasonLines = wrapText(packet.shingle_analysis.replacement_required_reason, PAGE_WIDTH - MARGIN * 2 - 30)
        let reasonY = yPosition - 35
        for (const line of reasonLines.slice(0, 2)) {
          page.drawText(line, {
            x: MARGIN + 10,
            y: reasonY,
            size: FONT_SIZE,
            font,
            color: TEXT_COLOR,
          })
          reasonY -= LINE_HEIGHT
        }
      }

      yPosition -= 75
    }

    // ===== POLICY PROVISIONS =====
    if (packet.policy_provisions.length > 0) {
      checkNewPage()
      drawSection('APPLICABLE POLICY PROVISIONS')

      for (const provision of packet.policy_provisions.slice(0, 3)) {
        checkNewPage()
        drawLine(`${provision.carrier} - ${provision.provision_name}`, true)

        const provisionLines = wrapText(provision.provision_text, PAGE_WIDTH - MARGIN * 2 - 20)
        for (const line of provisionLines.slice(0, 3)) {
          drawMutedLine(line, 10)
        }
        yPosition -= 5
      }
    }

    // ===== XACTIMATE PUNCH LIST =====
    if (packet.xactimate_punch_list && packet.xactimate_punch_list.length > 0) {
      checkNewPage()
      drawSection('XACTIMATE SCOPE REFERENCE')

      drawMutedLine('Line items for estimate entry:')
      yPosition -= 5

      for (const item of packet.xactimate_punch_list) {
        checkNewPage()
        drawLine(`☐ ${item.code} - ${item.description}${item.unit ? ` (${item.unit})` : ''}`, false, 10)
      }
    }

    // ===== FOOTER =====
    checkNewPage()
    yPosition -= 20
    page.drawLine({
      start: { x: MARGIN, y: yPosition },
      end: { x: PAGE_WIDTH - MARGIN, y: yPosition },
      thickness: 1,
      color: BORDER_COLOR,
    })
    yPosition -= 15

    page.drawText(`Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`, {
      x: MARGIN,
      y: yPosition,
      size: 8,
      font,
      color: MUTED_COLOR,
    })

    page.drawText('This packet contains building codes, manufacturer specifications, and policy provisions for claims support.', {
      x: MARGIN,
      y: yPosition - 12,
      size: 8,
      font,
      color: MUTED_COLOR,
    })

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    logger.info('Claims packet PDF generated', {
      projectId,
      packetId: packet.id,
      pageCount: pdfDoc.getPageCount(),
    })

    // Return PDF
    const contactName = `${packet.contact.first_name}-${packet.contact.last_name}`.replace(/\s+/g, '-')
    const filename = `claims-packet-${contactName}-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error('Error generating packet PDF:', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to generate packet PDF'))
  }
})
