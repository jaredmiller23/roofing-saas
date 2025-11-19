import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface SignatureData {
  signer_name: string
  signer_type: string
  signer_email: string
  signature_data: string // base64 image
  signed_at: string
}

export interface DocumentData {
  title: string
  description?: string
  document_type: string
  project?: { name: string }
  contact?: { first_name: string; last_name: string }
}

/**
 * Generate a signed PDF document
 *
 * If sourceUrl is provided, loads that PDF and adds signatures
 * Otherwise, creates a new PDF document from scratch
 *
 * @param documentData - Document metadata
 * @param signatures - Array of signature data
 * @param sourceUrl - Optional URL to existing PDF
 * @returns PDF bytes ready for download/upload
 */
export async function generateSignedPDF(
  documentData: DocumentData,
  signatures: SignatureData[],
  sourceUrl?: string
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument

  if (sourceUrl) {
    // Load existing PDF from URL
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from ${sourceUrl}`)
    }
    const existingPdfBytes = await response.arrayBuffer()
    pdfDoc = await PDFDocument.load(existingPdfBytes)
  } else {
    // Create new PDF from scratch
    pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792]) // Letter size (8.5" x 11")
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const { width, height } = page.getSize()

    // Header
    page.drawText(documentData.title, {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    })

    // Document details
    let currentY = height - 100

    if (documentData.project?.name) {
      page.drawText(`Project: ${documentData.project.name}`, {
        x: 50,
        y: currentY,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      })
      currentY -= 20
    }

    if (documentData.contact?.first_name) {
      const contactName = `${documentData.contact.first_name} ${documentData.contact.last_name || ''}`
      page.drawText(`Customer: ${contactName}`, {
        x: 50,
        y: currentY,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      })
      currentY -= 20
    }

    page.drawText(`Document Type: ${documentData.document_type}`, {
      x: 50,
      y: currentY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    })
    currentY -= 20

    if (documentData.description) {
      currentY -= 10
      page.drawText('Description:', {
        x: 50,
        y: currentY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      })
      currentY -= 20

      // Word wrap description
      const maxWidth = width - 100
      const words = documentData.description.split(' ')
      let line = ''

      for (const word of words) {
        const testLine = line + word + ' '
        const textWidth = font.widthOfTextAtSize(testLine, 11)

        if (textWidth > maxWidth && line !== '') {
          page.drawText(line, {
            x: 50,
            y: currentY,
            size: 11,
            font,
            color: rgb(0.2, 0.2, 0.2),
          })
          line = word + ' '
          currentY -= 15
        } else {
          line = testLine
        }
      }

      // Draw remaining line
      if (line) {
        page.drawText(line, {
          x: 50,
          y: currentY,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        })
        currentY -= 20
      }
    }
  }

  // Add signatures to the last page
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width, height } = lastPage.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Position signatures at bottom of page
  const signaturesPerRow = 2
  const signatureWidth = (width - 100) / signaturesPerRow - 20
  const signatureHeight = 80
  const signatureY = 200 // Start from bottom

  // Add "Signatures" header
  lastPage.drawText('Signatures', {
    x: 50,
    y: signatureY + signatureHeight + 20,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  })

  for (let i = 0; i < signatures.length; i++) {
    const signature = signatures[i]
    const col = i % signaturesPerRow
    const row = Math.floor(i / signaturesPerRow)

    const x = 50 + col * (signatureWidth + 20)
    const y = signatureY - row * (signatureHeight + 40)

    // Draw signature box
    lastPage.drawRectangle({
      x,
      y,
      width: signatureWidth,
      height: signatureHeight,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    })

    try {
      // Embed signature image
      const base64Data = signature.signature_data.includes('base64,')
        ? signature.signature_data.split('base64,')[1]
        : signature.signature_data

      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

      let image
      if (signature.signature_data.includes('image/png') || signature.signature_data.includes('data:image/png')) {
        image = await pdfDoc.embedPng(imageBytes)
      } else {
        image = await pdfDoc.embedJpg(imageBytes)
      }

      const imageDims = image.scale(0.5)
      const imageWidth = Math.min(imageDims.width, signatureWidth - 10)
      const imageHeight = (imageWidth / imageDims.width) * imageDims.height

      lastPage.drawImage(image, {
        x: x + (signatureWidth - imageWidth) / 2,
        y: y + signatureHeight - imageHeight - 5,
        width: imageWidth,
        height: Math.min(imageHeight, signatureHeight - 30),
      })
    } catch (error) {
      console.error('Error embedding signature image:', error)
      // Draw placeholder if image fails
      lastPage.drawText('(Signature)', {
        x: x + 10,
        y: y + signatureHeight / 2,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Draw signer info below signature
    lastPage.drawText(signature.signer_name, {
      x: x + 5,
      y: y - 15,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    })

    lastPage.drawText(`${signature.signer_type} - ${new Date(signature.signed_at).toLocaleDateString()}`, {
      x: x + 5,
      y: y - 28,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  }

  // Add timestamp footer
  const timestamp = new Date().toISOString()
  lastPage.drawText(`Generated: ${new Date(timestamp).toLocaleString()}`, {
    x: 50,
    y: 30,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })

  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

/**
 * Upload PDF to Supabase Storage
 *
 * @param pdfBytes - PDF file bytes
 * @param fileName - File name for storage
 * @param bucket - Supabase storage bucket name
 * @param supabase - Supabase client
 * @returns Public URL of uploaded PDF
 */
export async function uploadPDFToStorage(
  pdfBytes: Uint8Array,
  fileName: string,
  bucket: string,
  supabase: any // SupabaseClient type
): Promise<string> {
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    console.error('Error uploading PDF to storage:', error)
    throw new Error(`Failed to upload PDF: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded PDF')
  }

  return urlData.publicUrl
}
