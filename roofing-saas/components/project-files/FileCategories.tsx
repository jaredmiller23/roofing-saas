'use client'

import { useState } from 'react'
import {
  FileText,
  Camera,
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  Shield,
  Award,
  Layers,
  Folder,
  ChevronDown,
  Check
} from 'lucide-react'
import { RoofingFileCategory, ROOFING_FILE_CATEGORIES, getCategoryConfig } from '@/lib/types/file'

// Icon mapping
const ICON_MAP = {
  FileText,
  Camera,
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  Shield,
  Award,
  Layers,
  Folder
}

interface FileCategoriesProps {
  selectedCategory?: RoofingFileCategory | null
  onCategoryChange: (category: RoofingFileCategory | null) => void
  showAllOption?: boolean
  disabled?: boolean
  className?: string
}

export function FileCategories({
  selectedCategory,
  onCategoryChange,
  showAllOption = true,
  disabled = false,
  className = ''
}: FileCategoriesProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCategorySelect = (category: RoofingFileCategory | null) => {
    onCategoryChange(category)
    setIsOpen(false)
  }

  const selectedConfig = selectedCategory ? getCategoryConfig(selectedCategory) : null
  const SelectedIcon = selectedConfig?.icon ? ICON_MAP[selectedConfig.icon as keyof typeof ICON_MAP] : Folder

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-2">
          {selectedConfig ? (
            <>
              <SelectedIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{selectedConfig.label}</span>
            </>
          ) : (
            <>
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {showAllOption ? 'All Categories' : 'Select category...'}
              </span>
            </>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-80 overflow-y-auto">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              >
                <div className="flex items-center space-x-2 flex-1">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">All Categories</span>
                </div>
                {!selectedCategory && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            )}

            {ROOFING_FILE_CATEGORIES.map((category) => {
              const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP] || Folder
              const isSelected = selectedCategory === category.value

              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleCategorySelect(category.value)}
                  className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col items-start">
                      <span className="text-foreground font-medium">{category.label}</span>
                      <span className="text-xs text-muted-foreground">{category.description}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Category Filter Chips Component
interface CategoryFilterChipsProps {
  selectedCategories: RoofingFileCategory[]
  onCategoryToggle: (category: RoofingFileCategory) => void
  onClearAll: () => void
  className?: string
}

export function CategoryFilterChips({
  selectedCategories,
  onCategoryToggle,
  onClearAll,
  className = ''
}: CategoryFilterChipsProps) {
  if (selectedCategories.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {selectedCategories.map((categoryValue) => {
        const category = getCategoryConfig(categoryValue)
        const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP] || Folder

        return (
          <button
            key={categoryValue}
            onClick={() => onCategoryToggle(categoryValue)}
            className="inline-flex items-center space-x-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <IconComponent className="h-3 w-3" />
            <span>{category.label}</span>
            <span className="ml-1 text-primary/60">×</span>
          </button>
        )
      })}

      {selectedCategories.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground focus:outline-none"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

// Category Grid Display Component
interface CategoryGridProps {
  onCategorySelect: (category: RoofingFileCategory) => void
  selectedCategories?: RoofingFileCategory[]
  mode?: 'single' | 'multi'
  className?: string
}

export function CategoryGrid({
  onCategorySelect,
  selectedCategories = [],
  mode: _mode = 'single',
  className = ''
}: CategoryGridProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ${className}`}>
      {ROOFING_FILE_CATEGORIES.map((category) => {
        const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP] || Folder
        const isSelected = selectedCategories.includes(category.value)

        return (
          <button
            key={category.value}
            onClick={() => onCategorySelect(category.value)}
            className={`p-4 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              <IconComponent className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-center">
                <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {category.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {category.description}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Category Badge Component
interface CategoryBadgeProps {
  category: RoofingFileCategory
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function CategoryBadge({
  category,
  size = 'md',
  showIcon = true,
  className = ''
}: CategoryBadgeProps) {
  const config = getCategoryConfig(category)
  const IconComponent = ICON_MAP[config.icon as keyof typeof ICON_MAP] || Folder

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <span className={`inline-flex items-center space-x-1 bg-muted text-muted-foreground rounded-full font-medium ${sizeClasses[size]} ${className}`}>
      {showIcon && <IconComponent className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  )
}