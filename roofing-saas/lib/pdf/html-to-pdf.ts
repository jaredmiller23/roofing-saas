import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import type { Browser, PDFOptions } from 'puppeteer-core'
import { logger } from '@/lib/logger'

// Detect if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

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

/**
 * Get a browser instance configured for the current environment
 * - In serverless (Vercel): Uses @sparticuz/chromium with bundled binary
 * - In local dev: Uses local Chrome/Chromium installation
 */
async function getBrowser(): Promise<Browser> {
  if (isServerless) {
    // Serverless mode: Use @sparticuz/chromium (full package with bundled binary)
    // CRITICAL: Disable graphics mode for serverless (no GPU available)
    chromium.setGraphicsMode = false

    logger.info('Launching browser in serverless mode', {
      argsCount: chromium.args.length
    })

    try {
      // Full @sparticuz/chromium package includes the binary - no URL needed
      const execPath = await chromium.executablePath()
      logger.info('Chromium executable path resolved', { path: execPath })

      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: execPath,
        headless: chromium.headless,
      })

      logger.info('Browser launched successfully in serverless mode')
      return browser
    } catch (error) {
      logger.error('Failed to launch browser in serverless mode', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  } else {
    // Local development: Try to find a local Chrome installation
    logger.info('Launching browser in local mode')

    // Try common Chrome paths on different OS
    const possiblePaths = [
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      // Windows (via WSL or Windows paths)
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ]

    let executablePath: string | undefined
    for (const path of possiblePaths) {
      try {
        const fs = await import('fs')
        if (fs.existsSync(path)) {
          executablePath = path
          break
        }
      } catch {
        // Ignore errors, try next path
      }
    }

    if (!executablePath) {
      logger.warn('No local Chrome found, falling back to serverless chromium')
      // Fallback to serverless chromium even in local
      chromium.setGraphicsMode = false
      return puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
    }

    return puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      headless: true,
    })
  }
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

    // Close the browser after each use in serverless
    await browser.close()

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
 * This function is no longer needed in serverless environment
 * but kept for backward compatibility
 */
export async function closeBrowser(): Promise<void> {
  // No-op in serverless environment where each request gets fresh browser
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