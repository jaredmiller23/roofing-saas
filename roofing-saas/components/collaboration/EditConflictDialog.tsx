"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, Save, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export interface ConflictingField {
  /**
   * Field name or label
   */
  field: string

  /**
   * User who is editing this field
   */
  user: {
    id: string
    name?: string
    email?: string
  }

  /**
   * When the field was locked for editing
   */
  lockedAt?: string
}

export interface EditConflictDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean

  /**
   * Callback when the dialog should close
   */
  onOpenChange: (open: boolean) => void

  /**
   * List of fields that are in conflict
   */
  conflicts: ConflictingField[]

  /**
   * Entity name for better messaging
   */
  entityName?: string

  /**
   * Callback when user chooses to save anyway
   */
  onSaveAnyway?: () => void

  /**
   * Callback when user chooses to reload and lose changes
   */
  onReload?: () => void

  /**
   * Callback when user chooses to cancel
   */
  onCancel?: () => void

  /**
   * Whether the save operation is in progress
   */
  isSaving?: boolean

  /**
   * Whether the reload operation is in progress
   */
  isReloading?: boolean
}

/**
 * EditConflictDialog component displays when edit conflicts are detected
 *
 * Shows which fields are being edited by other users and provides resolution options.
 *
 * @example
 * ```tsx
 * <EditConflictDialog
 *   open={hasConflict}
 *   onOpenChange={setHasConflict}
 *   conflicts={[
 *     { field: "Status", user: { name: "John Doe" } },
 *     { field: "Notes", user: { name: "Jane Smith" } }
 *   ]}
 *   entityName="Contact"
 *   onSaveAnyway={handleSaveAnyway}
 *   onReload={handleReload}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function EditConflictDialog({
  open,
  onOpenChange,
  conflicts,
  entityName: _entityName = "this item",
  onSaveAnyway,
  onReload,
  onCancel,
  isSaving = false,
  isReloading = false,
}: EditConflictDialogProps) {
  const handleCancel = React.useCallback(() => {
    onCancel?.()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  const handleSaveAnyway = React.useCallback(() => {
    onSaveAnyway?.()
  }, [onSaveAnyway])

  const handleReload = React.useCallback(() => {
    onReload?.()
  }, [onReload])

  const conflictCount = conflicts.length
  const hasMultipleConflicts = conflictCount > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Edit Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {hasMultipleConflicts
              ? `${conflictCount} fields are currently being edited by other users.`
              : "A field is currently being edited by another user."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Concurrent editing detected</AlertTitle>
            <AlertDescription>
              Saving now may overwrite changes made by other users. Please review the conflicts below.
            </AlertDescription>
          </Alert>

          {/* Conflicting Fields List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Fields being edited:</h4>
            <div className="bg-muted/50 space-y-2 rounded-md border p-3">
              {conflicts.map((conflict, index) => (
                <ConflictItem key={index} conflict={conflict} />
              ))}
            </div>
          </div>

          {/* Resolution Options Info */}
          <div className="bg-muted/30 space-y-2 rounded-md border p-3 text-sm">
            <p className="font-medium">Resolution options:</p>
            <ul className="text-muted-foreground space-y-1 pl-4 text-xs">
              <li className="list-disc">
                <strong>Save anyway:</strong> Your changes will overwrite theirs
              </li>
              <li className="list-disc">
                <strong>Reload:</strong> Discard your changes and see the latest version
              </li>
              <li className="list-disc">
                <strong>Cancel:</strong> Keep editing and resolve conflicts manually
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving || isReloading}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleReload}
            disabled={isSaving || isReloading}
          >
            {isReloading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Reloading...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Reload & Lose Changes
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSaveAnyway}
            disabled={isSaving || isReloading}
          >
            {isSaving ? (
              <>
                <Save className="size-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Anyway
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ConflictItemProps {
  conflict: ConflictingField
}

function ConflictItem({ conflict }: ConflictItemProps) {
  const userName = conflict.user.name || conflict.user.email || "Another user"
  const timeAgo = conflict.lockedAt ? getTimeAgo(new Date(conflict.lockedAt)) : null

  return (
    <div className="flex items-start justify-between gap-2 rounded-md bg-background p-2">
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-sm">{conflict.field}</p>
        <p className="text-muted-foreground truncate text-xs">
          Being edited by {userName}
          {timeAgo && <span className="text-muted-foreground/70"> {timeAgo}</span>}
        </p>
      </div>
      <AlertTriangle className="text-destructive size-4 shrink-0" />
    </div>
  )
}

/**
 * Get a human-readable time ago string
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
