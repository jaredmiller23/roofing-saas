'use client'

import { useEffect, useState, useMemo } from 'react'
import { Link } from '@/lib/i18n/navigation'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import {
  FileText,
  ExternalLink,
  Search,
  Filter,
  Clock,
  Download,
  Eye
} from 'lucide-react'
import { ProjectFile, RoofingFileCategory, FileType, FileSearchFilters } from '@/lib/types/file'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileCategories, CategoryFilterChips } from './FileCategories'
import { FileThumbnail } from './FileThumbnail'
import { BulkFileActions, FileSelectionCheckbox } from './BulkFileActions'
import { CategoryBadge } from './FileCategories'
import { FolderBreadcrumb } from './FileFolderTree'

// Using ProjectFile interface from types instead of local definition

interface ProjectFilesTableProps {
  params: { [key: string]: string | string[] | undefined }
}

export function ProjectFilesTable({ params }: ProjectFilesTableProps) {
  const router = useRouter()
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt((params.page as string) || '1'))

  // Extract stable primitive value to avoid object-reference dependency issues
  const projectId = params.project_id as string | undefined

  // Enhanced state for new features
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<RoofingFileCategory[]>([])
  const [selectedFileTypes, setSelectedFileTypes] = useState<FileType[]>([])
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [_viewMode, _setViewMode] = useState<'table' | 'grid'>('table')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Build search filters
  const _searchFilters = useMemo((): FileSearchFilters => {
    return {
      ...(searchTerm && { search_term: searchTerm }),
      ...(selectedCategories.length > 0 && { file_category: selectedCategories }),
      ...(selectedFileTypes.length > 0 && { file_type: selectedFileTypes }),
      ...(currentFolderPath !== null && { folder_path: currentFolderPath || undefined }),
    }
  }, [searchTerm, selectedCategories, selectedFileTypes, currentFolderPath])

  useEffect(() => {
    async function fetchFiles() {
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()

        // Add project_id param
        if (projectId) {
          queryParams.set('project_id', projectId)
        }

        // Add search and filter params
        if (searchTerm) queryParams.set('search_term', searchTerm)
        selectedCategories.forEach(cat => queryParams.append('file_category', cat))
        selectedFileTypes.forEach(type => queryParams.append('file_type', type))
        if (currentFolderPath !== null) queryParams.set('folder_path', currentFolderPath)
        queryParams.set('sort_by', sortBy)
        queryParams.set('sort_order', sortOrder)
        queryParams.set('page', page.toString())

        // Use search endpoint if we have filters, otherwise use regular endpoint
        const hasFilters = searchTerm || selectedCategories.length > 0 || selectedFileTypes.length > 0 || currentFolderPath !== null
        const endpoint = hasFilters ? '/api/project-files/search' : '/api/project-files'

        const data = await apiFetch<{ files: ProjectFile[]; total: number }>(`${endpoint}?${queryParams.toString()}`)
        setFiles(data.files || [])
        setTotal(data.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [projectId, searchTerm, selectedCategories, selectedFileTypes, currentFolderPath, sortBy, sortOrder, page])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      await apiFetch(`/api/project-files/${id}`, {
        method: 'DELETE',
      })

      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }

  const handleBulkAction = async (operation: string, data: Record<string, unknown>) => {
    try {
      await apiFetch('/api/project-files/bulk', {
        method: 'POST',
        body: { operation, ...data }
      })

      // Refresh the file list
      router.refresh()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Bulk operation failed')
    }
  }

  const handleCategoryFilter = (category: RoofingFileCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1) // Reset to first page on search
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedCategories([])
    setSelectedFileTypes([])
    setCurrentFolderPath(null)
  }

  const getFileTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      photo: 'Photo',
      document: 'Document',
      contract: 'Contract',
      estimate: 'Estimate',
      invoice: 'Invoice',
      other: 'Other',
    }
    return type ? labels[type] || type : '-'
  }

  const getFileTypeColor = (type: string | null) => {
    const colors: Record<string, string> = {
      photo: 'bg-purple-500/10 text-purple-500',
      document: 'bg-blue-500/10 text-blue-500',
      contract: 'bg-green-500/10 text-green-500',
      estimate: 'bg-yellow-500/10 text-yellow-500',
      invoice: 'bg-orange-500/10 text-orange-500',
      other: 'bg-muted text-muted-foreground',
    }
    return type ? colors[type] || 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Header */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search files by name or description..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Breadcrumb */}
          <FolderBreadcrumb
            currentPath={currentFolderPath}
            onPathNavigate={setCurrentFolderPath}
          />

          {/* Active Filters */}
          <CategoryFilterChips
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryFilter}
            onClearAll={clearAllFilters}
          />

          {/* Extended Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Category
                </label>
                <FileCategories
                  selectedCategory={selectedCategories[0] || null}
                  onCategoryChange={(category) => {
                    if (category) {
                      handleCategoryFilter(category)
                    }
                  }}
                  showAllOption={true}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  File Type
                </label>
                <select
                  multiple
                  value={selectedFileTypes}
                  onChange={(e) => setSelectedFileTypes(Array.from(e.target.selectedOptions, option => option.value as FileType))}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="photo">Photo</option>
                  <option value="document">Document</option>
                  <option value="contract">Contract</option>
                  <option value="estimate">Estimate</option>
                  <option value="invoice">Invoice</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Sort By
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortBy(field)
                    setSortOrder(order as 'asc' | 'desc')
                  }}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="file_name-asc">Name A-Z</option>
                  <option value="file_name-desc">Name Z-A</option>
                  <option value="file_size-desc">Largest First</option>
                  <option value="file_size-asc">Smallest First</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFileIds.length > 0 && (
        <BulkFileActions
          files={files}
          selectedFileIds={selectedFileIds}
          onSelectionChange={setSelectedFileIds}
          onBulkAction={handleBulkAction}
        />
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total === 0 ? 'No files found' : `${total} file${total !== 1 ? 's' : ''} found`}
        </div>
        {files.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * 10) + 1}-{Math.min(page * 10, total)} of {total}
          </div>
        )}
      </div>

      {/* Empty State */}
      {files.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">
            {searchTerm || selectedCategories.length > 0 ? 'No matching files' : 'No files'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || selectedCategories.length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by uploading a file.'
            }
          </p>
          {(!searchTerm && selectedCategories.length === 0) && (
            <div className="mt-6">
              <Link
                href="/project-files/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
              >
                + Upload File
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Files Table */}
      {files.length > 0 && (
        <div className="bg-card shadow-sm rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-2 py-3">
                    <FileSelectionCheckbox
                      file={files[0]}
                      isSelected={selectedFileIds.length === files.length}
                      onToggle={() => {
                        if (selectedFileIds.length === files.length) {
                          setSelectedFileIds([])
                        } else {
                          setSelectedFileIds(files.map(f => f.id))
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Modified
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-accent">
                    <td className="px-2 py-4">
                      <FileSelectionCheckbox
                        file={file}
                        isSelected={selectedFileIds.includes(file.id)}
                        onToggle={(fileId) => {
                          setSelectedFileIds(prev =>
                            prev.includes(fileId)
                              ? prev.filter(id => id !== fileId)
                              : [...prev, fileId]
                          )
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileThumbnail file={file} size="sm" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{file.file_name}</div>
                          {file.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-md">{file.description}</div>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs leading-4 font-semibold rounded ${getFileTypeColor(file.file_type)}`}>
                              {getFileTypeLabel(file.file_type)}
                            </span>
                            {file.version && file.version > 1 && (
                              <span className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                v{file.version}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {file.file_category ? (
                        <CategoryBadge
                          category={file.file_category as RoofingFileCategory}
                          size="sm"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="View file"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <a
                          href={file.file_url}
                          download={file.file_name}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/project-files/${file.id}`}
                          className="p-1 text-primary hover:text-primary/80"
                          title="View details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Delete file"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 10 && (
            <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 10 >= total}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(page * 10, total)}</span> of{' '}
                    <span className="font-medium">{total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page * 10 >= total}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
