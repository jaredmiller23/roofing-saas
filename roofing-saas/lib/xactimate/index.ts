/**
 * Xactimate Integration Module
 *
 * Provides damage-to-code mapping and punch list generation
 * for manual entry into Xactimate (XM8).
 */

export {
  DAMAGE_TO_XACT_MAPPING,
  DAMAGE_TYPE_ALIASES,
  getLineItemsForDamage,
  getCategories,
  type XactLineItem,
  type PunchListItem,
} from './damage-mapping'

export {
  generatePunchList,
  formatPunchListAsText,
  type InspectionData,
  type PunchListOptions,
  type PunchListResult,
} from './punch-list'
