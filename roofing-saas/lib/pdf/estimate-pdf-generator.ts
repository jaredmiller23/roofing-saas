import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from '@pdfme/pdf-lib'
import { formatCurrency } from '@/lib/types/quote-option'

export interface EstimatePDFData {
  companyName: string
  companyTagline?: string
  projectName: string
  customerName: string
  customerAddress?: string
  customerEmail?: string
  customerPhone?: string
  estimateDate: string
  validUntil?: string
  options: EstimatePDFOption[]
  terms?: string
}

export interface EstimatePDFOption {
  name: string
  description?: string
  isRecommended: boolean
  lineItems: EstimatePDFLineItem[]
  subtotal: number
  taxRate?: number
  taxAmount?: number
  total: number
}

export interface EstimatePDFLineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  category: string
}

const COLORS = {
  primary: rgb(1, 0.51, 0.26), // #FF8243 coral
  dark: rgb(0, 0, 0),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.85, 0.85, 0.85),
  headerBg: rgb(0.15, 0.15, 0.2),
  white: rgb(1, 1, 1),
  accent: rgb(0.18, 0.48, 0.48), // #2D7A7A teal
}

/**
 * Generate a professional estimate/proposal PDF
 */
export async function generateEstimatePDF(data: EstimatePDFData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  for (let i = 0; i < data.options.length; i++) {
    const option = data.options[i]
    const page = pdfDoc.addPage([612, 792]) // Letter size
    const { width, height } = page.getSize()
    const margin = 50

    let y = height - margin

    // Company header
    y = drawHeader(page, boldFont, font, data, width, y, margin)

    // Option title
    y -= 10
    const optionLabel = data.options.length > 1
      ? `Option ${i + 1}: ${option.name}`
      : option.name
    page.drawText(optionLabel, {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: COLORS.primary,
    })
    y -= 5

    if (option.isRecommended) {
      page.drawText('★ RECOMMENDED', {
        x: margin + boldFont.widthOfTextAtSize(optionLabel, 18) + 10,
        y: y + 8,
        size: 10,
        font: boldFont,
        color: COLORS.accent,
      })
    }
    y -= 15

    if (option.description) {
      page.drawText(option.description, {
        x: margin,
        y,
        size: 10,
        font,
        color: COLORS.gray,
      })
      y -= 20
    }

    // Line items table
    y = drawLineItemsTable(page, font, boldFont, option.lineItems, width, y, margin)

    // Totals
    y -= 10
    y = drawTotals(page, font, boldFont, option, width, y, margin)

    // Terms (on first page only)
    if (i === 0 && data.terms && y > 120) {
      y -= 30
      y = drawTerms(page, font, boldFont, data.terms, width, y, margin)
    }

    // Footer
    drawFooter(page, font, data, width)
  }

  return pdfDoc.save()
}

function drawHeader(
  page: PDFPage,
  boldFont: PDFFont,
  font: PDFFont,
  data: EstimatePDFData,
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY

  // Company name
  page.drawText(data.companyName, {
    x: margin,
    y,
    size: 22,
    font: boldFont,
    color: COLORS.dark,
  })

  // "ESTIMATE" label on right
  const estimateLabel = 'ESTIMATE'
  const labelWidth = boldFont.widthOfTextAtSize(estimateLabel, 22)
  page.drawText(estimateLabel, {
    x: width - margin - labelWidth,
    y,
    size: 22,
    font: boldFont,
    color: COLORS.primary,
  })

  y -= 18
  if (data.companyTagline) {
    page.drawText(data.companyTagline, {
      x: margin,
      y,
      size: 9,
      font,
      color: COLORS.gray,
    })
    y -= 15
  }

  // Divider line
  y -= 5
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 2,
    color: COLORS.primary,
  })
  y -= 20

  // Two-column info: Customer (left) and Date/Project (right)
  const colRight = width / 2 + 20

  // Left column - Customer
  page.drawText('PREPARED FOR:', {
    x: margin,
    y,
    size: 8,
    font: boldFont,
    color: COLORS.gray,
  })
  y -= 15
  page.drawText(data.customerName, {
    x: margin,
    y,
    size: 11,
    font: boldFont,
    color: COLORS.dark,
  })
  y -= 15
  if (data.customerAddress) {
    page.drawText(data.customerAddress, {
      x: margin,
      y,
      size: 10,
      font,
      color: COLORS.dark,
    })
    y -= 14
  }
  if (data.customerEmail) {
    page.drawText(data.customerEmail, {
      x: margin,
      y,
      size: 10,
      font,
      color: COLORS.dark,
    })
    y -= 14
  }
  if (data.customerPhone) {
    page.drawText(data.customerPhone, {
      x: margin,
      y,
      size: 10,
      font,
      color: COLORS.dark,
    })
  }

  // Right column - Project info (render at same Y as customer section start)
  let rightY = startY - (data.companyTagline ? 58 : 43) - 20
  page.drawText('PROJECT:', {
    x: colRight,
    y: rightY,
    size: 8,
    font: boldFont,
    color: COLORS.gray,
  })
  rightY -= 15
  page.drawText(data.projectName, {
    x: colRight,
    y: rightY,
    size: 11,
    font: boldFont,
    color: COLORS.dark,
  })
  rightY -= 15
  page.drawText(`Date: ${data.estimateDate}`, {
    x: colRight,
    y: rightY,
    size: 10,
    font,
    color: COLORS.dark,
  })
  rightY -= 14
  if (data.validUntil) {
    page.drawText(`Valid Until: ${data.validUntil}`, {
      x: colRight,
      y: rightY,
      size: 10,
      font,
      color: COLORS.dark,
    })
  }

  return y - 20
}

function drawLineItemsTable(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  lineItems: EstimatePDFLineItem[],
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY
  const tableWidth = width - margin * 2

  // Column widths
  const cols = {
    desc: { x: margin, w: tableWidth * 0.4 },
    category: { x: margin + tableWidth * 0.4, w: tableWidth * 0.15 },
    qty: { x: margin + tableWidth * 0.55, w: tableWidth * 0.12 },
    unit: { x: margin + tableWidth * 0.67, w: tableWidth * 0.12 },
    price: { x: margin + tableWidth * 0.79, w: tableWidth * 0.21 },
  }

  // Table header
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: tableWidth,
    height: 18,
    color: COLORS.headerBg,
  })

  const headerY = y - 11
  page.drawText('Description', { x: cols.desc.x + 5, y: headerY, size: 9, font: boldFont, color: COLORS.white })
  page.drawText('Category', { x: cols.category.x + 5, y: headerY, size: 9, font: boldFont, color: COLORS.white })
  page.drawText('Qty', { x: cols.qty.x + 5, y: headerY, size: 9, font: boldFont, color: COLORS.white })
  page.drawText('Unit Price', { x: cols.unit.x + 5, y: headerY, size: 9, font: boldFont, color: COLORS.white })

  const totalHeader = 'Total'
  const totalHeaderWidth = boldFont.widthOfTextAtSize(totalHeader, 9)
  page.drawText(totalHeader, {
    x: cols.price.x + cols.price.w - totalHeaderWidth - 5,
    y: headerY,
    size: 9,
    font: boldFont,
    color: COLORS.white,
  })

  y -= 20

  // Table rows
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i]
    const rowY = y - 12

    // Alternating row background
    if (i % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - 15,
        width: tableWidth,
        height: 18,
        color: rgb(0.96, 0.96, 0.96),
      })
    }

    // Truncate description if too long
    let desc = item.description
    const maxDescWidth = cols.desc.w - 10
    while (font.widthOfTextAtSize(desc, 9) > maxDescWidth && desc.length > 3) {
      desc = desc.slice(0, -4) + '...'
    }

    page.drawText(desc, { x: cols.desc.x + 5, y: rowY, size: 9, font, color: COLORS.dark })
    page.drawText(item.category, { x: cols.category.x + 5, y: rowY, size: 9, font, color: COLORS.gray })
    page.drawText(`${item.quantity} ${item.unit}`, { x: cols.qty.x + 5, y: rowY, size: 9, font, color: COLORS.dark })

    const unitPriceStr = formatCurrency(item.unitPrice)
    page.drawText(unitPriceStr, { x: cols.unit.x + 5, y: rowY, size: 9, font, color: COLORS.dark })

    const totalStr = formatCurrency(item.totalPrice)
    const totalWidth = font.widthOfTextAtSize(totalStr, 9)
    page.drawText(totalStr, {
      x: cols.price.x + cols.price.w - totalWidth - 5,
      y: rowY,
      size: 9,
      font,
      color: COLORS.dark,
    })

    y -= 18
  }

  // Bottom border
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: COLORS.lightGray,
  })

  return y
}

function drawTotals(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  option: EstimatePDFOption,
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY
  const rightEdge = width - margin
  const labelX = rightEdge - 200

  // Subtotal
  page.drawText('Subtotal:', { x: labelX, y, size: 10, font, color: COLORS.dark })
  const subtotalStr = formatCurrency(option.subtotal)
  const subtotalWidth = font.widthOfTextAtSize(subtotalStr, 10)
  page.drawText(subtotalStr, { x: rightEdge - subtotalWidth, y, size: 10, font, color: COLORS.dark })
  y -= 18

  // Tax (if applicable)
  if (option.taxRate && option.taxAmount) {
    page.drawText(`Tax (${option.taxRate}%):`, { x: labelX, y, size: 10, font, color: COLORS.dark })
    const taxStr = formatCurrency(option.taxAmount)
    const taxWidth = font.widthOfTextAtSize(taxStr, 10)
    page.drawText(taxStr, { x: rightEdge - taxWidth, y, size: 10, font, color: COLORS.dark })
    y -= 18
  }

  // Total line
  page.drawLine({
    start: { x: labelX, y: y + 5 },
    end: { x: rightEdge, y: y + 5 },
    thickness: 1,
    color: COLORS.lightGray,
  })

  page.drawText('TOTAL:', { x: labelX, y, size: 14, font: boldFont, color: COLORS.primary })
  const totalStr = formatCurrency(option.total)
  const totalWidth = boldFont.widthOfTextAtSize(totalStr, 14)
  page.drawText(totalStr, { x: rightEdge - totalWidth, y, size: 14, font: boldFont, color: COLORS.primary })
  y -= 5

  // Double line under total
  page.drawLine({
    start: { x: labelX, y },
    end: { x: rightEdge, y },
    thickness: 2,
    color: COLORS.primary,
  })

  return y
}

function drawTerms(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  terms: string,
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY

  page.drawText('Terms & Conditions', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
    color: COLORS.dark,
  })
  y -= 15

  const maxWidth = width - margin * 2
  const words = terms.split(' ')
  let line = ''

  for (const word of words) {
    const testLine = line + word + ' '
    const textWidth = font.widthOfTextAtSize(testLine, 8)

    if (textWidth > maxWidth && line !== '') {
      page.drawText(line.trim(), { x: margin, y, size: 8, font, color: COLORS.gray })
      line = word + ' '
      y -= 12
      if (y < 50) break
    } else {
      line = testLine
    }
  }

  if (line && y > 50) {
    page.drawText(line.trim(), { x: margin, y, size: 8, font, color: COLORS.gray })
    y -= 12
  }

  return y
}

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  data: EstimatePDFData,
  width: number
): void {
  const footerY = 25
  const timestamp = new Date().toLocaleString()

  page.drawText(`${data.companyName} | Generated: ${timestamp}`, {
    x: 50,
    y: footerY,
    size: 7,
    font,
    color: COLORS.gray,
  })

  const pageText = 'Estimate - Confidential'
  const pageTextWidth = font.widthOfTextAtSize(pageText, 7)
  page.drawText(pageText, {
    x: width - 50 - pageTextWidth,
    y: footerY,
    size: 7,
    font,
    color: COLORS.gray,
  })
}

