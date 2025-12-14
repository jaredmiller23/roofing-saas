'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  FolderPlus
} from 'lucide-react'
import { FileTreeNode, ProjectFile, FileFolder, RoofingFileCategory } from '@/lib/types/file'
import { CategoryBadge } from './FileCategories'

interface FileFolderTreeProps {
  files: ProjectFile[]
  folders: FileFolder[]
  selectedPath?: string | null
  onPathSelect: (path: string | null) => void
  onFolderCreate?: (parentPath: string | null, name: string) => void
  onFolderRename?: (folderId: string, newName: string) => void
  onFolderDelete?: (folderId: string) => void
  onFileMove?: (fileId: string, targetPath: string | null) => void
  showFileActions?: boolean
  className?: string
}

export function FileFolderTree({
  files,
  folders,
  selectedPath,
  onPathSelect,
  onFolderCreate,
  onFolderRename,
  onFolderDelete,
  onFileMove: _onFileMove,
  showFileActions = false,
  className = ''
}: FileFolderTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']))
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolderInput, setShowNewFolderInput] = useState<string | null>(null)

  // Build tree structure
  const treeData = useMemo(() => {
    const tree: FileTreeNode[] = []
    const folderMap = new Map<string, FileTreeNode>()
    const pathToFiles = new Map<string, ProjectFile[]>()

    // Group files by folder path
    files.forEach(file => {
      const path = file.folder_path || ''
      if (!pathToFiles.has(path)) {
        pathToFiles.set(path, [])
      }
      pathToFiles.get(path)!.push(file)
    })

    // Create root folder node
    const rootNode: FileTreeNode = {
      id: 'root',
      name: 'Root',
      type: 'folder',
      path: '',
      children: []
    }
    folderMap.set('', rootNode)
    tree.push(rootNode)

    // Sort folders by path depth to ensure parent folders are processed first
    const sortedFolders = [...folders].sort((a, b) => {
      const aDepth = (a.path.match(/\//g) || []).length
      const bDepth = (b.path.match(/\//g) || []).length
      return aDepth - bDepth
    })

    // Add folder nodes
    sortedFolders.forEach(folder => {
      const folderNode: FileTreeNode = {
        id: folder.id,
        name: folder.name,
        type: 'folder',
        path: folder.path,
        children: [],
        folder_data: folder
      }

      folderMap.set(folder.path, folderNode)

      // Find parent folder
      const parentPath = folder.parent_folder_id
        ? folders.find(f => f.id === folder.parent_folder_id)?.path || ''
        : ''

      const parentNode = folderMap.get(parentPath)
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = []
        }
        parentNode.children.push(folderNode)
      }
    })

    // Add file nodes to appropriate folders
    pathToFiles.forEach((filesInPath, path) => {
      const folderNode = folderMap.get(path)
      if (folderNode) {
        if (!folderNode.children) {
          folderNode.children = []
        }
        filesInPath.forEach(file => {
          const fileNode: FileTreeNode = {
            id: file.id,
            name: file.file_name,
            type: 'file',
            path: file.folder_path || '',
            file_data: file
          }
          folderNode.children!.push(fileNode)
        })
      }
    })

    // Sort children (folders first, then files)
    const sortChildren = (node: FileTreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name)
          }
          return a.type === 'folder' ? -1 : 1
        })
        node.children.forEach(sortChildren)
      }
    }
    tree.forEach(sortChildren)

    return tree
  }, [files, folders])

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }, [])

  const handleFolderCreate = useCallback((parentPath: string | null) => {
    if (newFolderName.trim() && onFolderCreate) {
      onFolderCreate(parentPath, newFolderName.trim())
      setNewFolderName('')
      setShowNewFolderInput(null)
    }
  }, [newFolderName, onFolderCreate])

  const handleFolderRename = useCallback((folderId: string) => {
    if (newFolderName.trim() && onFolderRename) {
      onFolderRename(folderId, newFolderName.trim())
      setNewFolderName('')
      setEditingFolder(null)
    }
  }, [newFolderName, onFolderRename])

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderTreeNode = (node: FileTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.path)
    const isSelected = selectedPath === node.path
    const hasChildren = node.children && node.children.length > 0
    const isEditing = editingFolder === node.id

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-accent rounded cursor-pointer group ${
            isSelected ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          {/* Expand/Collapse Button */}
          {node.type === 'folder' && (
            <button
              onClick={() => toggleExpanded(node.path)}
              className="p-1 hover:bg-accent rounded mr-1 flex-shrink-0"
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )
              ) : (
                <div className="h-3 w-3" />
              )}
            </button>
          )}

          {/* Icon */}
          <div className="mr-2 flex-shrink-0">
            {node.type === 'folder' ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-primary" />
              )
            ) : (
              <File className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0" onClick={() => onPathSelect(node.type === 'folder' ? node.path : null)}>
            {isEditing ? (
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => handleFolderRename(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFolderRename(node.id)
                  if (e.key === 'Escape') setEditingFolder(null)
                }}
                className="w-full px-1 py-0 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            ) : (
              <div className="truncate">
                <span className="text-sm text-foreground">{node.name}</span>
                {node.type === 'file' && node.file_data && (
                  <div className="flex items-center space-x-2 mt-1">
                    {node.file_data.file_category && (
                      <CategoryBadge
                        category={node.file_data.file_category as RoofingFileCategory}
                        size="sm"
                        showIcon={false}
                      />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(node.file_data.file_size)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {showFileActions && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 ml-2">
              {node.type === 'folder' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowNewFolderInput(node.path)
                    }}
                    className="p-1 hover:bg-accent rounded"
                    title="Add folder"
                  >
                    <FolderPlus className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingFolder(node.id)
                      setNewFolderName(node.name)
                    }}
                    className="p-1 hover:bg-accent rounded"
                    title="Rename folder"
                  >
                    <Edit3 className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onFolderDelete && confirm('Delete this folder and all its contents?')) {
                        onFolderDelete(node.id)
                      }
                    }}
                    className="p-1 hover:bg-accent rounded text-red-500"
                    title="Delete folder"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* New folder input */}
        {showNewFolderInput === node.path && (
          <div
            className="flex items-center py-1 px-2"
            style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.5}rem` }}
          >
            <div className="p-1 mr-1">
              <div className="h-3 w-3" />
            </div>
            <FolderPlus className="h-4 w-4 text-primary mr-2" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={() => {
                if (newFolderName.trim()) {
                  handleFolderCreate(node.path)
                } else {
                  setShowNewFolderInput(null)
                  setNewFolderName('')
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFolderCreate(node.path)
                }
                if (e.key === 'Escape') {
                  setShowNewFolderInput(null)
                  setNewFolderName('')
                }
              }}
              placeholder="Folder name"
              className="flex-1 px-1 py-0 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
        )}

        {/* Children */}
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Folders & Files</h3>
          {onFolderCreate && (
            <button
              onClick={() => setShowNewFolderInput('')}
              className="flex items-center space-x-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <Plus className="h-3 w-3" />
              <span>New Folder</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-2 max-h-96 overflow-y-auto">
        {treeData.map(node => renderTreeNode(node))}
      </div>

      {/* Quick actions */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Folder className="h-3 w-3" />
            <span>{folders.length} folders</span>
          </div>
          <div className="flex items-center space-x-1">
            <File className="h-3 w-3" />
            <span>{files.length} files</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Breadcrumb component for current path
interface FolderBreadcrumbProps {
  currentPath: string | null
  onPathNavigate: (path: string | null) => void
  className?: string
}

export function FolderBreadcrumb({
  currentPath,
  onPathNavigate,
  className = ''
}: FolderBreadcrumbProps) {
  if (!currentPath) {
    return (
      <div className={`flex items-center text-sm text-muted-foreground ${className}`}>
        <Folder className="h-4 w-4 mr-1" />
        <span>Root</span>
      </div>
    )
  }

  const pathSegments = currentPath.split('/').filter(Boolean)
  const breadcrumbs = [
    { name: 'Root', path: null },
    ...pathSegments.map((segment, index) => ({
      name: segment,
      path: '/' + pathSegments.slice(0, index + 1).join('/')
    }))
  ]

  return (
    <div className={`flex items-center text-sm text-muted-foreground ${className}`}>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path || 'root'} className="flex items-center">
          {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
          <button
            onClick={() => onPathNavigate(crumb.path)}
            className="hover:text-foreground focus:outline-none"
          >
            {index === 0 && <Folder className="h-4 w-4 mr-1" />}
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  )
}