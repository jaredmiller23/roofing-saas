#!/usr/bin/env node

/**
 * Theme Compliance Scanner
 *
 * Scans codebase for hardcoded Tailwind colors that should use theme variables.
 * Enforces Coral Jade theme standards defined in .claude/rules/theme-standards.md
 *
 * Usage:
 *   node scripts/check-theme-compliance.js [--fix] [--verbose]
 *
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found
 *   2 - Script error
 */

const fs = require('fs');
const path = require('path');

// Hardcoded color patterns to detect
const VIOLATION_PATTERNS = [
  // Background colors
  { pattern: /className="[^"]*\bbg-white\b[^"]*"/g, replacement: 'bg-card or bg-background', severity: 'error' },
  { pattern: /className="[^"]*\bbg-gray-50\b[^"]*"/g, replacement: 'bg-muted/30', severity: 'error' },
  { pattern: /className="[^"]*\bbg-gray-100\b[^"]*"/g, replacement: 'bg-muted', severity: 'error' },
  { pattern: /className="[^"]*\bbg-gray-900\b[^"]*"/g, replacement: 'bg-sidebar or bg-background', severity: 'error' },
  { pattern: /className="[^"]*\bbg-gray-950\b[^"]*"/g, replacement: 'bg-sidebar or bg-background', severity: 'error' },
  { pattern: /className="[^"]*\bbg-blue-\d+\b[^"]*"/g, replacement: 'bg-primary or bg-secondary', severity: 'error' },
  { pattern: /className="[^"]*\bbg-purple-\d+\b[^"]*"/g, replacement: 'bg-primary', severity: 'error' },
  { pattern: /className="[^"]*\bbg-indigo-\d+\b[^"]*"/g, replacement: 'bg-primary or bg-secondary', severity: 'error' },

  // Border colors
  { pattern: /className="[^"]*\bborder-gray-\d+\b[^"]*"/g, replacement: 'border-border or border-sidebar-border', severity: 'error' },
  { pattern: /className="[^"]*\bborder-blue-\d+\b[^"]*"/g, replacement: 'border-primary', severity: 'warning' },
  { pattern: /className="[^"]*\bborder-purple-\d+\b[^"]*"/g, replacement: 'border-primary', severity: 'warning' },

  // Text colors
  { pattern: /className="[^"]*\btext-white\b[^"]*"/g, replacement: 'text-foreground or text-sidebar-foreground', severity: 'warning' },
  { pattern: /className="[^"]*\btext-gray-\d+\b[^"]*"/g, replacement: 'text-foreground or text-muted-foreground', severity: 'warning' },
  { pattern: /className="[^"]*\btext-blue-\d+\b[^"]*"/g, replacement: 'text-primary', severity: 'warning' },
  { pattern: /className="[^"]*\btext-purple-\d+\b[^"]*"/g, replacement: 'text-primary', severity: 'warning' },

  // Gradients
  { pattern: /className="[^"]*\bfrom-gray-\d+\b[^"]*"/g, replacement: 'from-sidebar or from-background', severity: 'error' },
  { pattern: /className="[^"]*\bto-gray-\d+\b[^"]*"/g, replacement: 'to-slate or to-background', severity: 'error' },

  // Focus rings
  { pattern: /className="[^"]*\bfocus:ring-blue-\d+\b[^"]*"/g, replacement: 'focus:ring-primary', severity: 'warning' },
  { pattern: /className="[^"]*\bfocus:border-blue-\d+\b[^"]*"/g, replacement: 'focus:border-primary', severity: 'warning' },
];

// Directories to scan
const SCAN_DIRS = [
  'app',
  'components',
  'lib',
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.spec\./,
  /\.test\./,
  // Allow hardcoded colors in specific files
  /components\/ui\/badge\.tsx/,
  /components\/charts\//,
];

// Allowed exceptions (loaded from .theme-exceptions.json if exists)
let allowedExceptions = [];

/**
 * Load exception rules from .theme-exceptions.json
 */
function loadExceptions() {
  const exceptionPath = path.join(process.cwd(), '.theme-exceptions.json');
  if (fs.existsSync(exceptionPath)) {
    try {
      const content = fs.readFileSync(exceptionPath, 'utf8');
      const data = JSON.parse(content);
      allowedExceptions = data.allowedPatterns || [];
      console.log(`✅ Loaded ${allowedExceptions.length} exception patterns\n`);
    } catch (error) {
      console.warn(`⚠️  Failed to load .theme-exceptions.json: ${error.message}\n`);
    }
  }
}

/**
 * Check if a violation is in the exception list
 */
function isException(filePath, lineNumber, violation) {
  const relativePath = path.relative(process.cwd(), filePath);

  return allowedExceptions.some(pattern => {
    // Pattern format: "path/pattern:line:violation-pattern"
    // Example: "components/ui/badge.tsx:*:bg-green-500"
    const [pathPattern, linePattern, violationPattern] = pattern.split(':');

    // Check path match
    const pathRegex = new RegExp(pathPattern.replace(/\*/g, '.*'));
    if (!pathRegex.test(relativePath)) return false;

    // Check line match (* means any line)
    if (linePattern !== '*' && parseInt(linePattern) !== lineNumber) return false;

    // Check violation match
    if (violationPattern && !violation.includes(violationPattern)) return false;

    return true;
  });
}

/**
 * Scan a single file for violations
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    VIOLATION_PATTERNS.forEach(({ pattern, replacement, severity }) => {
      const matches = line.matchAll(pattern);

      for (const match of matches) {
        const violation = match[0];

        // Check if this is an allowed exception
        if (isException(filePath, lineNumber, violation)) {
          continue;
        }

        // Extract the actual color class
        const colorClassMatch = violation.match(/\b(bg|border|text|from|to|focus:ring|focus:border)-(white|gray|blue|purple|indigo)-?\d*\b/);
        const colorClass = colorClassMatch ? colorClassMatch[0] : '';

        violations.push({
          file: filePath,
          line: lineNumber,
          column: match.index + 1,
          violation: colorClass,
          fullMatch: violation.substring(0, 100), // Truncate long matches
          replacement,
          severity,
        });
      }
    });
  });

  return violations;
}

/**
 * Recursively scan a directory
 */
function scanDirectory(dir, violations = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip excluded patterns
    if (EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, violations);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const fileViolations = scanFile(fullPath);
      violations.push(...fileViolations);
    }
  }

  return violations;
}

/**
 * Format violations for display
 */
function formatViolations(violations) {
  const grouped = violations.reduce((acc, v) => {
    const key = v.file;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  let output = '';

  Object.entries(grouped).forEach(([file, fileViolations]) => {
    const relativePath = path.relative(process.cwd(), file);
    output += `\n📄 ${relativePath} (${fileViolations.length} violations)\n`;

    fileViolations.forEach(v => {
      const icon = v.severity === 'error' ? '❌' : '⚠️ ';
      output += `   ${icon} Line ${v.line}: ${v.violation} → Use ${v.replacement}\n`;
    });
  });

  return output;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');

  console.log('🎨 Theme Compliance Scanner\n');
  console.log('Checking for hardcoded Tailwind colors...\n');

  // Load exceptions
  loadExceptions();

  // Scan directories
  let allViolations = [];
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      if (verbose) console.log(`Scanning ${dir}/...`);
      const violations = scanDirectory(dirPath);
      allViolations.push(...violations);
    }
  }

  // Report results
  if (allViolations.length === 0) {
    console.log('✅ No theme violations found! All components use theme variables.\n');
    return 0;
  }

  console.log(`❌ Found ${allViolations.length} theme violations:\n`);
  console.log(formatViolations(allViolations));

  // Summary by severity
  const errors = allViolations.filter(v => v.severity === 'error').length;
  const warnings = allViolations.filter(v => v.severity === 'warning').length;

  console.log('\n📊 Summary:');
  console.log(`   Errors:   ${errors}`);
  console.log(`   Warnings: ${warnings}`);
  console.log(`   Total:    ${allViolations.length}\n`);

  // Suggestions
  console.log('💡 To fix violations:');
  console.log('   1. Replace hardcoded colors with theme variables (see .claude/rules/theme-standards.md)');
  console.log('   2. Add legitimate exceptions to .theme-exceptions.json');
  console.log('   3. Re-run: node scripts/check-theme-compliance.js\n');

  // Exit with error code for CI/hooks
  return 1;
}

// Run if executed directly
if (require.main === module) {
  try {
    const exitCode = main();
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Scanner error:', error.message);
    console.error(error.stack);
    process.exit(2);
  }
}

module.exports = { scanFile, scanDirectory, loadExceptions };
