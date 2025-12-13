import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getCurrentUser } from '@/lib/auth/session'
import type { ClaimData } from '@/lib/claims/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

const STATUS_LABELS: Record<string, string> = {
  'new': 'New',
  'documents_pending': 'Docs Pending',
  'under_review': 'Under Review',
  'approved': 'Approved',
  'paid': 'Paid',
  'closed': 'Closed',
  'disputed': 'Disputed',
  'supplement_filed': 'Supplement Filed',
  'escalated': 'Escalated',
}

/**
 * POST /api/claims/export/pdf
 * Generate a PDF export of claims data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { claims } = await request.json() as { claims: ClaimData[] }

    if (!claims || claims.length === 0) {
      throw ValidationError('No claims provided for export')
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageWidth = 792 // Letter width in points
    const pageHeight = 612 // Letter height in points (landscape)
    const margin = 40
    const fontSize = 10
    const lineHeight = 14

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let yPosition = pageHeight - margin

    // Title
    page.drawText('Claims Export Report', {
      x: margin,
      y: yPosition,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30

    // Export date
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    yPosition -= 25

    // Table headers
    const headers = [
      { text: 'Claim #', x: margin, width: 80 },
      { text: 'Status', x: margin + 80, width: 80 },
      { text: 'Date of Loss', x: margin + 160, width: 80 },
      { text: 'Property Address', x: margin + 240, width: 150 },
      { text: 'City, State', x: margin + 390, width: 120 },
      { text: 'Initial Est.', x: margin + 510, width: 70 },
      { text: 'Approved', x: margin + 580, width: 70 },
    ]

    headers.forEach((header) => {
      page.drawText(header.text, {
        x: header.x,
        y: yPosition,
        size: fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      })
    })
    yPosition -= lineHeight + 2

    // Draw header underline
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    })
    yPosition -= 5

    // Table rows
    for (const claim of claims) {
      // Check if we need a new page
      if (yPosition < margin + 50) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        yPosition = pageHeight - margin
      }

      const row = [
        { text: claim.claim_number || 'N/A', x: margin },
        { text: STATUS_LABELS[claim.status] || claim.status, x: margin + 80 },
        { text: new Date(claim.date_of_loss).toLocaleDateString(), x: margin + 160 },
        { text: truncateText(claim.property_address, 25), x: margin + 240 },
        { text: `${claim.property_city}, ${claim.property_state}`, x: margin + 390 },
        { text: claim.initial_estimate ? `$${claim.initial_estimate.toLocaleString()}` : '$0', x: margin + 510 },
        { text: claim.approved_amount ? `$${claim.approved_amount.toLocaleString()}` : '$0', x: margin + 580 },
      ]

      row.forEach((cell) => {
        page.drawText(cell.text, {
          x: cell.x,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
      })

      yPosition -= lineHeight
    }

    // Summary section
    yPosition -= 20
    if (yPosition < margin + 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      yPosition = pageHeight - margin
    }

    const totalInitialEstimate = claims.reduce((sum, c) => sum + (c.initial_estimate || 0), 0)
    const totalApproved = claims.reduce((sum, c) => sum + (c.approved_amount || 0), 0)
    const totalPaid = claims.reduce((sum, c) => sum + (c.paid_amount || 0), 0)

    page.drawText('Summary:', {
      x: margin,
      y: yPosition,
      size: fontSize + 2,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight + 5

    page.drawText(`Total Claims: ${claims.length}`, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    page.drawText(`Total Initial Estimates: $${totalInitialEstimate.toLocaleString()}`, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    page.drawText(`Total Approved Amount: $${totalApproved.toLocaleString()}`, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    page.drawText(`Total Paid Amount: $${totalPaid.toLocaleString()}`, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Return PDF as download
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="claims-export-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    logger.error('Error generating PDF export:', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to generate PDF export'))
  }
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
