import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/signature-documents/generate-pdf
 *
 * DEPRECATED: This endpoint previously used Chromium/Puppeteer to generate PDFs
 * from HTML templates. This approach was not viable on Vercel serverless due to:
 * - 250MB function size limits
 * - 10-60s timeout constraints
 * - Chromium binary compatibility issues
 *
 * The new approach:
 * - Templates render as HTML during signing (faster, mobile-friendly)
 * - PDF is generated AFTER signing using @pdfme/generator (pure JS, no Chromium)
 * - Template preview is now done via HTML preview in the editor
 *
 * If you're seeing this error, update your code to use HTML preview instead.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'PDF preview has been replaced with HTML preview',
      message: 'Documents now use HTML preview during editing and signing. ' +
               'PDF is generated after signing using a lightweight library. ' +
               'Use the HTML preview feature in the template editor instead.',
      migration: {
        old: 'POST /api/signature-documents/generate-pdf with Chromium',
        new: 'HTML preview rendered client-side, PDF generated post-signing with @pdfme/generator',
      }
    },
    { status: 410 } // 410 Gone - resource no longer available
  )
}
