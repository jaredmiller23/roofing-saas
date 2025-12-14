import { cn } from "@/lib/utils"
import { Button } from "./button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  }
  className?: string
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-6 min-h-[200px]", className)}>
      <div className="rounded-full bg-muted p-3 mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      )}
      {action && (
        <Button 
          onClick={action.onClick}
          variant={action.variant || "default"}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface EmptyListProps {
  icon: LucideIcon
  title: string
  description?: string
  searchTerm?: string
  onClearSearch?: () => void
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  }
  className?: string
}

// Specialized empty state for filtered/searched lists
export function EmptyList({ 
  icon: Icon, 
  title, 
  description, 
  searchTerm,
  onClearSearch,
  action,
  className 
}: EmptyListProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-6 min-h-[200px]", className)}>
      <div className="rounded-full bg-muted p-3 mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      
      {/* Search-specific messaging */}
      {searchTerm && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            No results found for <strong className="text-foreground">"{searchTerm}"</strong>
          </p>
          {onClearSearch && (
            <Button variant="outline" size="sm" onClick={onClearSearch}>
              Clear search
            </Button>
          )}
        </div>
      )}
      
      {action && !searchTerm && (
        <Button 
          onClick={action.onClick}
          variant={action.variant || "default"}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface EmptyTableProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  }
  className?: string
}

// Specialized empty state for tables
export function EmptyTable({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyTableProps) {
  return (
    <tr>
      <td colSpan={100} className={cn("", className)}>
        <div className="flex flex-col items-center justify-center text-center p-8">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
          )}
          {action && (
            <Button 
              onClick={action.onClick}
              variant={action.variant || "default"}
            >
              {action.label}
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
