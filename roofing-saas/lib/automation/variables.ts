/**
 * Variable Replacement Utility
 * Replace variables in workflow step configs with actual values
 */

/**
 * Replace variables in a string or object
 * Variables format: {{path.to.value}}
 */
export function replaceVariables(
  input: unknown,
  context: Record<string, unknown>
): unknown {
  if (typeof input === 'string') {
    return replaceVariablesInString(input, context)
  }

  if (Array.isArray(input)) {
    return input.map((item) => replaceVariables(item, context))
  }

  if (input !== null && typeof input === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      result[key] = replaceVariables(value, context)
    }
    return result
  }

  return input
}

/**
 * Replace variables in a string
 */
function replaceVariablesInString(
  str: string,
  context: Record<string, unknown>
): string {
  // Match {{variable.path}}
  return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getValueByPath(context, path.trim())
    return value !== undefined ? String(value) : match
  })
}

/**
 * Get value from object by dot-separated path
 * e.g., getValueByPath({a: {b: {c: 1}}}, 'a.b.c') => 1
 */
function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[part]
  }

  return current
}

/**
 * Check if a string contains variables
 */
export function hasVariables(str: string): boolean {
  return /\{\{[^}]+\}\}/.test(str)
}

/**
 * Extract all variable paths from a string
 */
export function extractVariables(str: string): string[] {
  const matches = str.match(/\{\{([^}]+)\}\}/g)
  if (!matches) {
    return []
  }

  return matches.map((match) => match.replace(/\{\{|\}\}/g, '').trim())
}
