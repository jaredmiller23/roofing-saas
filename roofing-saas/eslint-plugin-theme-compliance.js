/**
 * Custom ESLint Plugin: Theme Compliance
 *
 * Enforces Coral Jade theme standards by detecting hardcoded Tailwind colors.
 * See .claude/rules/theme-standards.md for theming guidelines.
 */

const fs = require('fs');
const path = require('path');

// Load exception patterns
let allowedExceptions = [];
try {
  const exceptionPath = path.join(__dirname, '.theme-exceptions.json');
  if (fs.existsSync(exceptionPath)) {
    const data = JSON.parse(fs.readFileSync(exceptionPath, 'utf8'));
    allowedExceptions = data.allowedPatterns || [];
  }
} catch (error) {
  console.warn('Failed to load .theme-exceptions.json:', error.message);
}

/**
 * Check if a file/line is in the exception list
 */
function isException(filePath, lineNumber, colorClass) {
  const relativePath = path.relative(process.cwd(), filePath);

  return allowedExceptions.some(pattern => {
    const [pathPattern, linePattern, violationPattern] = pattern.split(':');

    // Check path match
    const pathRegex = new RegExp(pathPattern.replace(/\*/g, '.*'));
    if (!pathRegex.test(relativePath)) return false;

    // Check line match (* means any line)
    if (linePattern !== '*' && parseInt(linePattern) !== lineNumber) return false;

    // Check violation match
    if (violationPattern && !colorClass.includes(violationPattern)) return false;

    return true;
  });
}

/**
 * Theme compliance rule
 */
const noHardcodedColorsRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce use of theme variables instead of hardcoded Tailwind colors',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      hardcodedBackground: 'Hardcoded background color "{{color}}" detected. Use {{replacement}} instead.',
      hardcodedBorder: 'Hardcoded border color "{{color}}" detected. Use {{replacement}} instead.',
      hardcodedText: 'Hardcoded text color "{{color}}" detected. Use {{replacement}} instead.',
      hardcodedGradient: 'Hardcoded gradient color "{{color}}" detected. Use {{replacement}} instead.',
      hardcodedFocus: 'Hardcoded focus color "{{color}}" detected. Use {{replacement}} instead.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    return {
      JSXAttribute(node) {
        // Only check className attributes
        if (node.name.name !== 'className') return;

        // Get the className value
        let classNameValue = '';
        if (node.value?.type === 'Literal') {
          classNameValue = node.value.value || '';
        } else if (node.value?.type === 'JSXExpressionContainer') {
          // Handle template literals and expressions
          const expression = node.value.expression;
          if (expression.type === 'TemplateLiteral') {
            // Concatenate all string parts
            classNameValue = expression.quasis.map(q => q.value.raw).join(' ');
          }
        }

        if (!classNameValue) return;

        const lineNumber = node.loc.start.line;

        // Define violation patterns with replacements
        const violations = [
          // Backgrounds
          { pattern: /\bbg-white\b/, replacement: 'bg-card or bg-background', type: 'hardcodedBackground' },
          { pattern: /\bbg-gray-(50|100)\b/, replacement: 'bg-muted', type: 'hardcodedBackground' },
          { pattern: /\bbg-gray-(900|950)\b/, replacement: 'bg-sidebar or bg-background', type: 'hardcodedBackground' },
          { pattern: /\bbg-(blue|purple|indigo)-\d+/, replacement: 'bg-primary or bg-secondary', type: 'hardcodedBackground' },

          // Borders
          { pattern: /\bborder-gray-\d+/, replacement: 'border-border or border-sidebar-border', type: 'hardcodedBorder' },
          { pattern: /\bborder-(blue|purple)-\d+/, replacement: 'border-primary', type: 'hardcodedBorder' },

          // Text
          { pattern: /\btext-white\b/, replacement: 'text-foreground or text-sidebar-foreground', type: 'hardcodedText' },
          { pattern: /\btext-gray-\d+/, replacement: 'text-foreground or text-muted-foreground', type: 'hardcodedText' },
          { pattern: /\btext-(blue|purple)-\d+/, replacement: 'text-primary', type: 'hardcodedText' },

          // Gradients
          { pattern: /\bfrom-gray-\d+/, replacement: 'from-sidebar or from-background', type: 'hardcodedGradient' },
          { pattern: /\bto-gray-\d+/, replacement: 'to-slate or to-background', type: 'hardcodedGradient' },

          // Focus states
          { pattern: /\bfocus:ring-(blue|purple)-\d+/, replacement: 'focus:ring-primary', type: 'hardcodedFocus' },
          { pattern: /\bfocus:border-(blue|purple)-\d+/, replacement: 'focus:border-primary', type: 'hardcodedFocus' },
        ];

        // Check each violation pattern
        for (const { pattern, replacement, type } of violations) {
          const match = classNameValue.match(pattern);
          if (match) {
            const colorClass = match[0];

            // Check if this is an allowed exception
            if (isException(filename, lineNumber, colorClass)) {
              continue;
            }

            context.report({
              node,
              messageId: type,
              data: {
                color: colorClass,
                replacement,
              },
            });
          }
        }
      },
    };
  },
};

// Export plugin
module.exports = {
  rules: {
    'no-hardcoded-colors': noHardcodedColorsRule,
  },
  configs: {
    recommended: {
      plugins: ['theme-compliance'],
      rules: {
        'theme-compliance/no-hardcoded-colors': 'error',
      },
    },
  },
};
