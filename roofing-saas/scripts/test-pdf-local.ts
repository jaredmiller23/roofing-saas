import { generateProfessionalPDF } from '@/lib/pdf/html-to-pdf'

async function test() {
  console.log('Testing PDF generation locally...')
  console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local')
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <h1>Test PDF Generation</h1>
      <p>This is a test document.</p>
    </body>
    </html>
  `
  
  try {
    const start = Date.now()
    const buffer = await generateProfessionalPDF(html)
    const duration = Date.now() - start
    console.log(`✅ PDF generated in ${duration}ms`)
    console.log(`   Size: ${buffer.length} bytes`)
    
    // Save to file for inspection
    const fs = await import('fs')
    fs.writeFileSync('/tmp/test-pdf.pdf', buffer)
    console.log('   Saved to /tmp/test-pdf.pdf')
  } catch (error) {
    console.error('❌ PDF generation failed:', error)
  }
}

test()
