/**
 * Shared auth types
 *
 * Defined separately to avoid circular imports between session.ts and request-context.ts
 */

export type UserStatus = 'active' | 'deactivated' | 'suspended' | 'pending'

export interface UserContext {
  tenantId: string
  role: string
  status: UserStatus
}
