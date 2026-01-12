/**
 * Color utilities for mapping between HEX and Tailwind classes
 */

// Map HEX colors to Tailwind background classes
const HEX_TO_TAILWIND_BG: Record<string, string> = {
  '#6B7280': 'bg-gray-500',
  '#3B82F6': 'bg-blue-500',
  '#8B5CF6': 'bg-purple-500',
  '#F97316': 'bg-orange-500',
  '#22C55E': 'bg-green-500',
  '#06B6D4': 'bg-cyan-500',
  '#059669': 'bg-emerald-600',
  '#EF4444': 'bg-red-500',
  // Additional common colors
  '#10B981': 'bg-emerald-500',
  '#14B8A6': 'bg-teal-500',
  '#6366F1': 'bg-indigo-500',
  '#EC4899': 'bg-pink-500',
  '#F59E0B': 'bg-amber-500',
  '#84CC16': 'bg-lime-500',
}

/**
 * Convert HEX color to Tailwind background class
 * Falls back to bg-gray-500 if color not found
 */
export function hexToTailwindBg(hex: string): string {
  // Normalize to uppercase
  const normalizedHex = hex.toUpperCase()
  return HEX_TO_TAILWIND_BG[normalizedHex] || 'bg-gray-500'
}

/**
 * Convert stage name to slug format
 * e.g., "Quote Sent" -> "quote_sent"
 */
export function stageNameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Convert slug to display name
 * e.g., "quote_sent" -> "Quote Sent"
 */
export function slugToDisplayName(slug: string): string {
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
