import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, degrees } from '@pdfme/pdf-lib'

export interface InvoicePDFData {
  companyName: string
  companyTagline?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string

  // Invoice details
  invoiceNumber: string
  poNumber?: string
  invoiceDate: string
  dueDate: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partial'

  // Customer
  customerName: string
  customerAddress?: string
  customerEmail?: string
  customerPhone?: string

  // Project
  projectName: string
  projectAddress?: string

  // Line items
  lineItems: InvoicePDFLineItem[]
  subtotal: number
  taxRate?: number
  taxAmount?: number
  total: number

  // Payment info
  amountPaid?: number
  balanceDue?: number
  paymentHistory?: PaymentRecord[]

  // Terms
  terms?: string
  notes?: string
}

export interface InvoicePDFLineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  category?: string
}

export interface PaymentRecord {
  date: string
  amount: number
  method: string
  reference?: string
}

const COLORS = {
  primary: rgb(1, 0.51, 0.26), // #FF8243 coral
  dark: rgb(0, 0, 0),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.85, 0.85, 0.85),
  headerBg: rgb(0.15, 0.15, 0.2),
  white: rgb(1, 1, 1),
  accent: rgb(0.18, 0.48, 0.48), // #2D7A7A teal
  paid: rgb(0.2, 0.6, 0.2), // Green for PAID
  overdue: rgb(0.8, 0.2, 0.2), // Red for OVERDUE
}

/**
 * Generate a professional invoice PDF
 */
export async function generateInvoicePDF(data: InvoicePDFData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.addPage([612, 792]) // Letter size
  const { width, height } = page.getSize()
  const margin = 50

  let y = height - margin

  // Company header
  y = drawHeader(page, boldFont, font, data, width, y, margin)

  // Line items table
  y = drawLineItemsTable(page, font, boldFont, data.lineItems, width, y, margin)

  // Totals and payment info
  y -= 10
  y = drawTotals(page, font, boldFont, data, width, y, margin)

  // Payment history (if any)
  if (data.paymentHistory && data.paymentHistory.length > 0 && y > 180) {
    y -= 20
    y = drawPaymentHistory(page, font, boldFont, data.paymentHistory, width, y, margin)
  }

  // Notes (if any)
  if (data.notes && y > 120) {
    y -= 20
    y = drawNotes(page, font, boldFont, data.notes, width, y, margin)
  }

  // Terms (if any)
  if (data.terms && y > 80) {
    y -= 15
    y = drawTerms(page, font, boldFont, data.terms, width, y, margin)
  }

  // PAID watermark for paid invoices
  if (data.status === 'paid') {
    drawPaidWatermark(page, boldFont, width, height)
  }

  // Footer
  drawFooter(page, font, data, width)

  return pdfDoc.save()
}

function drawHeader(
  page: PDFPage,
  boldFont: PDFFont,
  font: PDFFont,
  data: InvoicePDFData,
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

  // "INVOICE" label on right
  const invoiceLabel = 'INVOICE'
  const labelWidth = boldFont.widthOfTextAtSize(invoiceLabel, 22)
  page.drawText(invoiceLabel, {
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

  // Company contact info
  if (data.companyAddress || data.companyPhone || data.companyEmail) {
    const contactParts: string[] = []
    if (data.companyAddress) contactParts.push(data.companyAddress)
    if (data.companyPhone) contactParts.push(data.companyPhone)
    if (data.companyEmail) contactParts.push(data.companyEmail)

    page.drawText(contactParts.join(' | '), {
      x: margin,
      y,
      size: 8,
      font,
      color: COLORS.gray,
    })
    y -= 12
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

  // Two-column info: Customer (left) and Invoice Details (right)
  const colRight = width / 2 + 20

  // Left column - Bill To
  page.drawText('BILL TO:', {
    x: margin,
    y,
    size: 8,
    font: boldFont,
    color: COLORS.gray,
  })
  let leftY = y - 15
  page.drawText(data.customerName, {
    x: margin,
    y: leftY,
    size: 11,
    font: boldFont,
    color: COLORS.dark,
  })
  leftY -= 14
  if (data.customerAddress) {
    page.drawText(data.customerAddress, {
      x: margin,
      y: leftY,
      size: 10,
      font,
      color: COLORS.dark,
    })
    leftY -= 13
  }
  if (data.customerEmail) {
    page.drawText(data.customerEmail, {
      x: margin,
      y: leftY,
      size: 10,
      font,
      color: COLORS.dark,
    })
    leftY -= 13
  }
  if (data.customerPhone) {
    page.drawText(data.customerPhone, {
      x: margin,
      y: leftY,
      size: 10,
      font,
      color: COLORS.dark,
    })
    leftY -= 13
  }

  // Project info below bill-to
  if (data.projectName) {
    leftY -= 8
    page.drawText('PROJECT:', {
      x: margin,
      y: leftY,
      size: 8,
      font: boldFont,
      color: COLORS.gray,
    })
    leftY -= 14
    page.drawText(data.projectName, {
      x: margin,
      y: leftY,
      size: 10,
      font: boldFont,
      color: COLORS.dark,
    })
    leftY -= 13
    if (data.projectAddress) {
      page.drawText(data.projectAddress, {
        x: margin,
        y: leftY,
        size: 10,
        font,
        color: COLORS.dark,
      })
    }
  }

  // Right column - Invoice details
  let rightY = y
  const detailLabelX = colRight
  const detailValueX = colRight + 100

  // Invoice Number
  page.drawText('Invoice #:', { x: detailLabelX, y: rightY, size: 10, font, color: COLORS.gray })
  page.drawText(data.invoiceNumber, { x: detailValueX, y: rightY, size: 10, font: boldFont, color: COLORS.dark })
  rightY -= 16

  // PO Number (if any)
  if (data.poNumber) {
    page.drawText('PO #:', { x: detailLabelX, y: rightY, size: 10, font, color: COLORS.gray })
    page.drawText(data.poNumber, { x: detailValueX, y: rightY, size: 10, font, color: COLORS.dark })
    rightY -= 16
  }

  // Invoice Date
  page.drawText('Date:', { x: detailLabelX, y: rightY, size: 10, font, color: COLORS.gray })
  page.drawText(data.invoiceDate, { x: detailValueX, y: rightY, size: 10, font, color: COLORS.dark })
  rightY -= 16

  // Due Date
  page.drawText('Due Date:', { x: detailLabelX, y: rightY, size: 10, font, color: COLORS.gray })
  const dueDateColor = data.status === 'overdue' ? COLORS.overdue : COLORS.dark
  page.drawText(data.dueDate, { x: detailValueX, y: rightY, size: 10, font: boldFont, color: dueDateColor })
  rightY -= 16

  // Status badge
  page.drawText('Status:', { x: detailLabelX, y: rightY, size: 10, font, color: COLORS.gray })
  const statusText = data.status.toUpperCase()
  const statusColor = data.status === 'paid' ? COLORS.paid :
                      data.status === 'overdue' ? COLORS.overdue :
                      data.status === 'partial' ? COLORS.accent : COLORS.gray
  page.drawText(statusText, { x: detailValueX, y: rightY, size: 10, font: boldFont, color: statusColor })

  return Math.min(leftY, rightY) - 10
}

function drawLineItemsTable(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  lineItems: InvoicePDFLineItem[],
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY
  const tableWidth = width - margin * 2

  // Column widths
  const cols = {
    desc: { x: margin, w: tableWidth * 0.45 },
    qty: { x: margin + tableWidth * 0.45, w: tableWidth * 0.15 },
    unit: { x: margin + tableWidth * 0.60, w: tableWidth * 0.18 },
    price: { x: margin + tableWidth * 0.78, w: tableWidth * 0.22 },
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
  page.drawText('Qty', { x: cols.qty.x + 5, y: headerY, size: 9, font: boldFont, color: COLORS.white })
  page.drawText('Unit Price', { x: cols.unit.x + 5, y: headerY, size: 9, font: boldFont, color: COLORS.white })

  const totalHeader = 'Amount'
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
  data: InvoicePDFData,
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY
  const rightEdge = width - margin
  const labelX = rightEdge - 200

  // Subtotal
  page.drawText('Subtotal:', { x: labelX, y, size: 10, font, color: COLORS.dark })
  const subtotalStr = formatCurrency(data.subtotal)
  const subtotalWidth = font.widthOfTextAtSize(subtotalStr, 10)
  page.drawText(subtotalStr, { x: rightEdge - subtotalWidth, y, size: 10, font, color: COLORS.dark })
  y -= 18

  // Tax (if applicable)
  if (data.taxRate && data.taxAmount) {
    page.drawText(`Tax (${data.taxRate}%):`, { x: labelX, y, size: 10, font, color: COLORS.dark })
    const taxStr = formatCurrency(data.taxAmount)
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

  page.drawText('TOTAL:', { x: labelX, y, size: 12, font: boldFont, color: COLORS.dark })
  const totalStr = formatCurrency(data.total)
  const totalWidth = boldFont.widthOfTextAtSize(totalStr, 12)
  page.drawText(totalStr, { x: rightEdge - totalWidth, y, size: 12, font: boldFont, color: COLORS.dark })
  y -= 20

  // Amount paid (if any)
  if (data.amountPaid && data.amountPaid > 0) {
    page.drawText('Amount Paid:', { x: labelX, y, size: 10, font, color: COLORS.paid })
    const paidStr = formatCurrency(-data.amountPaid)
    const paidWidth = font.widthOfTextAtSize(paidStr, 10)
    page.drawText(paidStr, { x: rightEdge - paidWidth, y, size: 10, font, color: COLORS.paid })
    y -= 18
  }

  // Balance due
  const balanceDue = data.balanceDue ?? (data.total - (data.amountPaid || 0))
  if (balanceDue !== data.total) {
    page.drawLine({
      start: { x: labelX, y: y + 5 },
      end: { x: rightEdge, y: y + 5 },
      thickness: 1,
      color: COLORS.lightGray,
    })

    const balanceColor = balanceDue <= 0 ? COLORS.paid : (data.status === 'overdue' ? COLORS.overdue : COLORS.primary)
    page.drawText('BALANCE DUE:', { x: labelX, y, size: 14, font: boldFont, color: balanceColor })
    const balanceStr = formatCurrency(Math.max(0, balanceDue))
    const balanceWidth = boldFont.widthOfTextAtSize(balanceStr, 14)
    page.drawText(balanceStr, { x: rightEdge - balanceWidth, y, size: 14, font: boldFont, color: balanceColor })
    y -= 5

    // Double line under balance
    page.drawLine({
      start: { x: labelX, y },
      end: { x: rightEdge, y },
      thickness: 2,
      color: balanceColor,
    })
  }

  return y
}

function drawPaymentHistory(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  payments: PaymentRecord[],
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY

  page.drawText('Payment History', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
    color: COLORS.dark,
  })
  y -= 15

  for (const payment of payments) {
    const paymentLine = `${payment.date} - ${formatCurrency(payment.amount)} via ${payment.method}${payment.reference ? ` (${payment.reference})` : ''}`
    page.drawText(paymentLine, {
      x: margin,
      y,
      size: 9,
      font,
      color: COLORS.paid,
    })
    y -= 13
  }

  return y
}

function drawNotes(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  notes: string,
  width: number,
  startY: number,
  margin: number
): number {
  let y = startY

  page.drawText('Notes', {
    x: margin,
    y,
    size: 10,
    font: boldFont,
    color: COLORS.dark,
  })
  y -= 14

  // Word wrap notes
  const maxWidth = width / 2 - margin
  const words = notes.split(' ')
  let line = ''

  for (const word of words) {
    const testLine = line + word + ' '
    const textWidth = font.widthOfTextAtSize(testLine, 8)

    if (textWidth > maxWidth && line !== '') {
      page.drawText(line.trim(), { x: margin, y, size: 8, font, color: COLORS.gray })
      line = word + ' '
      y -= 11
      if (y < 50) break
    } else {
      line = testLine
    }
  }

  if (line && y > 50) {
    page.drawText(line.trim(), { x: margin, y, size: 8, font, color: COLORS.gray })
    y -= 11
  }

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
    size: 9,
    font: boldFont,
    color: COLORS.gray,
  })
  y -= 12

  const maxWidth = width - margin * 2
  const words = terms.split(' ')
  let line = ''

  for (const word of words) {
    const testLine = line + word + ' '
    const textWidth = font.widthOfTextAtSize(testLine, 7)

    if (textWidth > maxWidth && line !== '') {
      page.drawText(line.trim(), { x: margin, y, size: 7, font, color: COLORS.gray })
      line = word + ' '
      y -= 10
      if (y < 40) break
    } else {
      line = testLine
    }
  }

  if (line && y > 40) {
    page.drawText(line.trim(), { x: margin, y, size: 7, font, color: COLORS.gray })
    y -= 10
  }

  return y
}

function drawPaidWatermark(
  page: PDFPage,
  boldFont: PDFFont,
  width: number,
  height: number
): void {
  const watermarkText = 'PAID'
  const watermarkSize = 72

  // Semi-transparent green watermark diagonally
  page.drawText(watermarkText, {
    x: width / 2 - boldFont.widthOfTextAtSize(watermarkText, watermarkSize) / 2,
    y: height / 2,
    size: watermarkSize,
    font: boldFont,
    color: rgb(0.2, 0.7, 0.2),
    opacity: 0.15,
    rotate: degrees(-30),
  })
}

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  data: InvoicePDFData,
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

  const pageText = `Invoice #${data.invoiceNumber}`
  const pageTextWidth = font.widthOfTextAtSize(pageText, 7)
  page.drawText(pageText, {
    x: width - 50 - pageTextWidth,
    y: footerY,
    size: 7,
    font,
    color: COLORS.gray,
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
