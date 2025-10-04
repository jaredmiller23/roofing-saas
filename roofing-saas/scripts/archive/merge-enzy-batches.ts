/**
 * Merge multiple Enzy JSON batches into single file
 */

import * as fs from 'fs'

const inputFile = process.argv[2]
const outputFile = process.argv[3]

if (!inputFile || !outputFile) {
  console.error('Usage: npx tsx merge-enzy-batches.ts <input-file> <output-file>')
  process.exit(1)
}

console.log(`Merging batches from: ${inputFile}`)
console.log(`Output to: ${outputFile}`)

// Read the file
const content = fs.readFileSync(inputFile, 'utf-8')

// Split by }{ pattern to separate batches
const batches = content.split(/\}\s*\{/)

const allLeads: any[] = []

for (let i = 0; i < batches.length; i++) {
  let batchContent = batches[i]

  // Add back the braces we split on
  if (i === 0) {
    batchContent = batchContent + '}'
  } else if (i === batches.length - 1) {
    batchContent = '{' + batchContent
  } else {
    batchContent = '{' + batchContent + '}'
  }

  try {
    const batch = JSON.parse(batchContent)
    if (batch.leads && Array.isArray(batch.leads)) {
      allLeads.push(...batch.leads)
      console.log(`  Batch ${i + 1}: ${batch.leads.length} leads`)
    }
  } catch (error: any) {
    console.error(`  Error parsing batch ${i + 1}:`, error.message)
  }
}

// Create merged output
const merged = {
  totalLeads: allLeads.length,
  leads: allLeads
}

// Write to output file
fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2))

console.log(`\n✅ Merged ${allLeads.length} leads into ${outputFile}`)
