import puppeteer, { Browser, PDFOptions } from 'puppeteer'
import { logger } from '@/lib/logger'

interface GenerateOptions {
  format?: 'A4' | 'Letter'
  margin?: {
    top?: string | number
    right?: string | number
    bottom?: string | number
    left?: string | number
  }
  printBackground?: boolean
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
}

let browser: Browser | null = null

/**
 * Get or create a shared browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    })

    // Handle process exit to cleanup browser
    process.on('exit', async () => {
      if (browser) {
        await browser.close()
        browser = null
      }
    })
  }
  return browser
}

/**
 * Generate PDF from HTML content
 *
 * @param htmlContent - The HTML content to convert
 * @param options - PDF generation options
 * @returns PDF buffer
 */
export async function generatePDFFromHTML(
  htmlContent: string,
  options: GenerateOptions = {}
): Promise<Buffer> {
  const startTime = Date.now()

  try {
    const browser = await getBrowser()
    const page = await browser.newPage()

    // Set content type and load HTML
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000, // 30 second timeout
    })

    // Default PDF options
    const pdfOptions: PDFOptions = {
      format: options.format || 'A4',
      margin: options.margin || {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
      printBackground: options.printBackground !== false,
      displayHeaderFooter: options.displayHeaderFooter || false,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || '',
    }

    // Generate PDF
    const pdf = await page.pdf(pdfOptions)

    // Close the page to free memory
    await page.close()

    const duration = Date.now() - startTime
    logger.info('PDF generated from HTML', {
      duration,
      htmlSize: htmlContent.length,
      pdfSize: pdf.length,
    })

    return Buffer.from(pdf)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error generating PDF from HTML', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      htmlSize: htmlContent.length,
    })
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate PDF from HTML template with data
 *
 * @param htmlTemplate - HTML template with placeholders
 * @param data - Data to merge into template
 * @param options - PDF generation options
 * @returns PDF buffer
 */
export async function generatePDFFromTemplate(
  htmlTemplate: string,
  data: Record<string, unknown>,
  options: GenerateOptions = {}
): Promise<Buffer> {
  // Import the merge function
  const { mergeTemplateWithData } = await import('@/lib/templates/merge')

  // Merge data into template
  const htmlContent = mergeTemplateWithData(htmlTemplate, data)

  // Generate PDF
  return generatePDFFromHTML(htmlContent, options)
}

/**
 * Cleanup browser instance
 * Useful for tests or graceful shutdown
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

/**
 * Enhanced PDF generation with professional styling
 * Adds default CSS styles to ensure professional output
 */
export async function generateProfessionalPDF(
  htmlContent: string,
  options: GenerateOptions = {}
): Promise<Buffer> {
  // Add professional CSS if not already present
  const hasStyles = htmlContent.includes('<style>') || htmlContent.includes('stylesheet')

  let styledHTML = htmlContent
  if (!hasStyles) {
    const defaultCSS = `
      <style>
        @media print {
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
          }

          .page-break {
            page-break-before: always;
          }

          .no-page-break {
            page-break-inside: avoid;
          }

          h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            page-break-inside: avoid;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }

          th {
            background-color: #f8f9fa;
            font-weight: 600;
          }

          .signature-section {
            margin-top: 3em;
            page-break-inside: avoid;
          }

          .signature-box {
            border: 1px solid #333;
            height: 60px;
            margin: 10px 0;
            display: inline-block;
            width: 200px;
          }

          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 9pt;
            color: #666;
          }
        }
      </style>
    `

    // Insert styles before closing head tag or at the beginning
    if (htmlContent.includes('</head>')) {
      styledHTML = htmlContent.replace('</head>', `${defaultCSS}</head>`)
    } else {
      styledHTML = `${defaultCSS}${htmlContent}`
    }
  }

  return generatePDFFromHTML(styledHTML, {
    format: 'A4',
    margin: {
      top: '0.75in',
      right: '0.75in',
      bottom: '0.75in',
      left: '0.75in',
    },
    printBackground: true,
    ...options,
  })
}