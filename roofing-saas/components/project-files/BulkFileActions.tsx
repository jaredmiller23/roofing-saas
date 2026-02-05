'use client'

import { useState, useCallback } from 'react'
import {
  Square,
  CheckSquare,
  Trash2,
  FolderOpen,
  Download,
  Archive,
  Tag,
  FileType as FileTypeIcon,
  MoreHorizontal,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { ProjectFile, BulkFileOperation, RoofingFileCategory, FileType, FILE_TYPE_LABELS } from '@/lib/types/file'
import { FileCategories } from './FileCategories'

interface BulkFileActionsProps {
  files: ProjectFile[]
  selectedFileIds: string[]
  onSelectionChange: (fileIds: string[]) => void
  onBulkAction: (operation: BulkFileOperation, data: Record<string, unknown>) => Promise<void>
  availableFolders?: Array<{ path: string; name: string }>
  disabled?: boolean
  className?: string
}

export function BulkFileActions({
  files,
  selectedFileIds,
  onSelectionChange,
  onBulkAction,
  availableFolders = [],
  disabled = false,
  className = ''
}: BulkFileActionsProps) {
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [activeAction, setActiveAction] = useState<BulkFileOperation | null>(null)
  const [targetFolder, setTargetFolder] = useState<string>('')
  const [newCategory, setNewCategory] = useState<RoofingFileCategory | null>(null)
  const [newFileType, setNewFileType] = useState<FileType | null>(null)
  const [processing, setProcessing] = useState(false)

  const selectedFiles = files.filter(file => selectedFileIds.includes(file.id))
  const isAllSelected = files.length > 0 && selectedFileIds.length === files.length
  const isPartiallySelected = selectedFileIds.length > 0 && selectedFileIds.length < files.length

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(files.map(file => file.id))
    }
  }, [files, isAllSelected, onSelectionChange])

  const toggleSelectFile = useCallback((fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      onSelectionChange(selectedFileIds.filter(id => id !== fileId))
    } else {
      onSelectionChange([...selectedFileIds, fileId])
    }
  }, [selectedFileIds, onSelectionChange])

  const handleBulkAction = async (operation: BulkFileOperation, data?: Record<string, unknown>) => {
    if (selectedFileIds.length === 0) return

    try {
      setProcessing(true)
      await onBulkAction(operation, {
        file_ids: selectedFileIds,
        operation,
        ...data
      })
      setActiveAction(null)
      setShowActionMenu(false)
      // Clear selections after successful operation
      onSelectionChange([])
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error('Operation failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteFiles = () => {
    if (confirm(`Delete ${selectedFileIds.length} selected file(s)? This cannot be undone.`)) {
      handleBulkAction('delete')
    }
  }

  const handleMoveToFolder = () => {
    if (targetFolder !== undefined) {
      handleBulkAction('move_to_folder', { target_folder_path: targetFolder || null })
    }
  }

  const handleChangeCategory = () => {
    if (newCategory) {
      handleBulkAction('change_category', { new_category: newCategory })
    }
  }

  const handleChangeType = () => {
    if (newFileType) {
      handleBulkAction('change_type', { new_type: newFileType })
    }
  }

  const getActionButton = (operation: BulkFileOperation) => {
    const buttons = {
      move_to_folder: {
        icon: <FolderOpen className="h-4 w-4" />,
        label: 'Move to Folder',
        color: 'text-blue-600 hover:text-blue-700'
      },
      change_category: {
        icon: <Tag className="h-4 w-4" />,
        label: 'Change Category',
        color: 'text-green-600 hover:text-green-700'
      },
      change_type: {
        icon: <FileTypeIcon className="h-4 w-4" />,
        label: 'Change Type',
        color: 'text-purple-600 hover:text-purple-700'
      },
      archive: {
        icon: <Archive className="h-4 w-4" />,
        label: 'Archive',
        color: 'text-yellow-600 hover:text-yellow-700'
      },
      delete: {
        icon: <Trash2 className="h-4 w-4" />,
        label: 'Delete',
        color: 'text-red-600 hover:text-red-700'
      },
      download_zip: {
        icon: <Download className="h-4 w-4" />,
        label: 'Download ZIP',
        color: 'text-muted-foreground hover:text-foreground'
      }
    }

    const button = buttons[operation]
    if (!button) return null

    return (
      <button
        onClick={() => {
          if (operation === 'delete') {
            handleDeleteFiles()
          } else if (operation === 'archive' || operation === 'download_zip') {
            handleBulkAction(operation)
          } else {
            setActiveAction(operation)
          }
        }}
        className={`flex items-center space-x-2 px-3 py-2 text-sm ${button.color} hover:bg-accent focus:outline-none focus:bg-accent w-full text-left`}
        disabled={processing}
      >
        {button.icon}
        <span>{button.label}</span>
      </button>
    )
  }

  if (selectedFileIds.length === 0) {
    return (
      <div className={`flex items-center text-sm text-muted-foreground ${className}`}>
        <button
          onClick={toggleSelectAll}
          className="flex items-center space-x-2 hover:text-foreground focus:outline-none"
        >
          <Square className="h-4 w-4" />
          <span>Select all files</span>
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm ${className}`}>
      {/* Selection Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSelectAll}
            className="text-primary hover:text-primary/80 focus:outline-none"
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : isPartiallySelected ? (
              <div className="h-4 w-4 bg-primary rounded-sm flex items-center justify-center">
                <div className="h-2 w-2 bg-card rounded-sm" />
              </div>
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
          <span className="text-sm font-medium text-foreground">
            {selectedFileIds.length} file{selectedFileIds.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={disabled || processing}
            >
              <span>Actions</span>
              <MoreHorizontal className="h-3 w-3" />
            </button>

            {showActionMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-20">
                  <div className="py-1">
                    {getActionButton('move_to_folder')}
                    {getActionButton('change_category')}
                    {getActionButton('change_type')}
                    <hr className="my-1 border-border" />
                    {getActionButton('download_zip')}
                    {getActionButton('archive')}
                    {getActionButton('delete')}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => onSelectionChange([])}
            className="p-1 text-muted-foreground hover:text-foreground focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Forms */}
      {activeAction && (
        <div className="p-4 border-b border-border bg-muted/30">
          {activeAction === 'move_to_folder' && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Move to Folder</h4>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Destination Folder
                </label>
                <select
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Root Folder</option>
                  {availableFolders.map((folder) => (
                    <option key={folder.path} value={folder.path}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setActiveAction(null)}
                  className="px-3 py-1 border border-border rounded text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveToFolder}
                  disabled={processing}
                  className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {processing ? 'Moving...' : 'Move Files'}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'change_category' && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Change Category</h4>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  New Category
                </label>
                <FileCategories
                  selectedCategory={newCategory}
                  onCategoryChange={setNewCategory}
                  showAllOption={false}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setActiveAction(null)}
                  className="px-3 py-1 border border-border rounded text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeCategory}
                  disabled={!newCategory || processing}
                  className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {processing ? 'Updating...' : 'Update Category'}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'change_type' && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Change File Type</h4>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  New File Type
                </label>
                <select
                  value={newFileType || ''}
                  onChange={(e) => setNewFileType(e.target.value as FileType)}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select file type...</option>
                  {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setActiveAction(null)}
                  className="px-3 py-1 border border-border rounded text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeType}
                  disabled={!newFileType || processing}
                  className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {processing ? 'Updating...' : 'Update Type'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Files List */}
      <div className="p-4">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {selectedFiles.map((file) => (
            <div key={file.id} className="flex items-center space-x-3 p-2 bg-accent/50 rounded">
              <button
                onClick={() => toggleSelectFile(file.id)}
                className="text-primary hover:text-primary/80 focus:outline-none"
              >
                <CheckSquare className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {file.file_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {file.file_type} • {file.file_category}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {file.file_size ? (
                  file.file_size < 1024 * 1024
                    ? `${(file.file_size / 1024).toFixed(1)} KB`
                    : `${(file.file_size / (1024 * 1024)).toFixed(1)} MB`
                ) : (
                  'Unknown size'
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Individual File Selection Checkbox Component
interface FileSelectionCheckboxProps {
  file: ProjectFile
  isSelected: boolean
  onToggle: (fileId: string) => void
  disabled?: boolean
  className?: string
}

export function FileSelectionCheckbox({
  file,
  isSelected,
  onToggle,
  disabled = false,
  className = ''
}: FileSelectionCheckboxProps) {
  return (
    <button
      onClick={() => onToggle(file.id)}
      disabled={disabled}
      className={`text-primary hover:text-primary/80 focus:outline-none disabled:opacity-50 ${className}`}
    >
      {isSelected ? (
        <CheckSquare className="h-4 w-4" />
      ) : (
        <Square className="h-4 w-4" />
      )}
    </button>
  )
}