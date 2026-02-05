'use client'

import { useState, useRef } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import { getFieldConfig, type FieldType } from './FieldPalette'

export interface SignatureFieldPlacement {
  id: string
  type: FieldType
  label: string
  page: number
  x: number // percentage from left
  y: number // percentage from top
  width: number // pixels
  height: number // pixels
  required: boolean
  assignedTo: 'customer' | 'company' | 'any'
  content?: string // Optional preset text content for 'text' type fields
}

interface PlacedFieldProps {
  field: SignatureFieldPlacement
  isSelected: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onUpdate: (updates: Partial<SignatureFieldPlacement>) => void
  onDelete: () => void
}

export function PlacedField({
  field,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
}: PlacedFieldProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [_isResizing, setIsResizing] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const fieldStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  const config = getFieldConfig(field.type)
  const Icon = config?.icon

  const getPointerCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      const touch = e.touches[0] || (e as TouchEvent).changedTouches?.[0]
      return touch ? { clientX: touch.clientX, clientY: touch.clientY } : { clientX: 0, clientY: 0 }
    }
    return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY }
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return

    e.preventDefault()
    e.stopPropagation()
    onSelect()
    setIsDragging(true)
    const coords = getPointerCoords(e)
    dragStartRef.current = { x: coords.clientX, y: coords.clientY }
    fieldStartRef.current = { x: field.x, y: field.y, width: field.width, height: field.height }

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return
      const moveCoords = getPointerCoords(moveEvent)
      const containerRect = containerRef.current.getBoundingClientRect()
      const deltaX = ((moveCoords.clientX - dragStartRef.current.x) / containerRect.width) * 100
      const deltaY = ((moveCoords.clientY - dragStartRef.current.y) / containerRect.height) * 100

      const newX = Math.max(0, Math.min(100 - (field.width / containerRect.width * 100), fieldStartRef.current.x + deltaX))
      const newY = Math.max(0, Math.min(100 - (field.height / containerRect.height * 100), fieldStartRef.current.y + deltaY))

      onUpdate({ x: newX, y: newY })
    }

    const handleEnd = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
  }

  const handleResizePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    setIsResizing(true)
    const coords = getPointerCoords(e)
    dragStartRef.current = { x: coords.clientX, y: coords.clientY }
    fieldStartRef.current = { x: field.x, y: field.y, width: field.width, height: field.height }

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveCoords = getPointerCoords(moveEvent)
      const deltaX = moveCoords.clientX - dragStartRef.current.x
      const deltaY = moveCoords.clientY - dragStartRef.current.y

      const newWidth = Math.max(40, fieldStartRef.current.width + deltaX)
      const newHeight = Math.max(20, fieldStartRef.current.height + deltaY)

      onUpdate({ width: newWidth, height: newHeight })
    }

    const handleEnd = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
  }

  const assigneeColor = {
    customer: 'border-primary bg-primary/20',
    company: 'border-secondary bg-secondary/20',
    any: 'border-muted-foreground bg-muted/50',
  }[field.assignedTo]

  return (
    <div
      className={`absolute cursor-move group
        ${assigneeColor}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background z-20' : 'z-10'}
        ${isDragging ? 'opacity-75' : ''}
        border-2 rounded`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: field.width,
        height: field.height,
        touchAction: 'none',
      }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Field Content */}
      <div className="flex items-center justify-center h-full gap-1 px-1">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
        <span className={`truncate ${field.type === 'text' && field.content ? 'text-sm font-medium text-foreground' : 'text-xs text-foreground'}`}>
          {field.type === 'text' && field.content ? field.content : field.label}
        </span>
        {field.required && <span className="text-red-500 text-xs shrink-0">*</span>}
      </div>

      {/* Controls (visible on hover/select) */}
      {isSelected && (
        <>
          {/* Drag Handle */}
          <div className="absolute -top-6 left-0 flex items-center gap-1 bg-card border border-border rounded px-1 py-0.5 shadow-sm">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">{field.type}</span>
          </div>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full
                       hover:bg-red-600 shadow-sm transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>

          {/* Resize Handle */}
          <div
            className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 bg-primary
                       rounded-sm cursor-se-resize shadow-sm touch-none"
            onMouseDown={handleResizePointerDown}
            onTouchStart={handleResizePointerDown}
          />
        </>
      )}
    </div>
  )
}
