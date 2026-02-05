#!/usr/bin/env node
/**
 * Inject fresh schema-data.json into all visualization HTML files.
 * Replaces the inline SCHEMA_DATA block so files work from file:// protocol.
 *
 * Usage: node scripts/inject-viz-data.js
 * (Run extract-schema-graph.js first to generate fresh data)
 */

const fs = require('fs');
const path = require('path');

const VIZ_DIR = path.join(__dirname, '..', 'visualizations');
const DATA_FILE = path.join(VIZ_DIR, 'schema-data.json');

const HTML_FILES = [
  'force-graph.html',
  'architecture-map.html',
  'static-poster.html',
];

// Markers that bracket the inline data block
const DATA_START = '<script>const SCHEMA_DATA = ';
const DATA_END = ';</script>';

function inject() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('schema-data.json not found. Run extract-schema-graph.js first.');
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(DATA_FILE, 'utf-8').trim();

  let updated = 0;

  for (const file of HTML_FILES) {
    const filePath = path.join(VIZ_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn('Skipping ' + file + ' (not found)');
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf-8');

    const startIdx = html.indexOf(DATA_START);
    if (startIdx === -1) {
      console.warn('Skipping ' + file + ' (no SCHEMA_DATA block found)');
      continue;
    }

    const endIdx = html.indexOf(DATA_END, startIdx);
    if (endIdx === -1) {
      console.warn('Skipping ' + file + ' (no closing marker found)');
      continue;
    }

    const before = html.substring(0, startIdx);
    const after = html.substring(endIdx + DATA_END.length);

    const newHtml = before + DATA_START + jsonContent + DATA_END + after;

    fs.writeFileSync(filePath, newHtml);
    updated++;
    console.log('Updated: ' + file);
  }

  console.log('\nInjected fresh data into ' + updated + '/' + HTML_FILES.length + ' files');
}

inject();
