'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Clock,
  Download,
  Eye,
  RotateCcw,
  Plus,
  AlertCircle,
  FileText,
  User,
  Archive,
  Upload,
  Edit3
} from 'lucide-react'
import { FileVersion, VersionChangeType, ProjectFile } from '@/lib/types/file'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FileVersionHistoryProps {
  fileId: string
  currentFile: ProjectFile
  onVersionRestore?: (versionId: string) => void
  onNewVersionUpload?: (file: File, description?: string) => void
  className?: string
}

export function FileVersionHistory({
  fileId,
  currentFile,
  onVersionRestore,
  onNewVersionUpload,
  className = ''
}: FileVersionHistoryProps) {
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  useEffect(() => {
    fetchVersions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/project-files/versions?file_id=${fileId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch file versions')
      }
      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions')
    } finally {
      setLoading(false)
    }
  }

  const handleVersionRestore = async (versionId: string) => {
    if (!confirm('Restore this version? This will create a new version with this content.')) {
      return
    }

    try {
      if (onVersionRestore) {
        await onVersionRestore(versionId)
        await fetchVersions() // Refresh versions
      }
    } catch (_err) {
      alert('Failed to restore version')
    }
  }

  const handleNewVersionUpload = async () => {
    if (!uploadFile) return

    try {
      if (onNewVersionUpload) {
        await onNewVersionUpload(uploadFile, uploadDescription)
        setShowUploadForm(false)
        setUploadFile(null)
        setUploadDescription('')
        await fetchVersions() // Refresh versions
      }
    } catch (_err) {
      alert('Failed to upload new version')
    }
  }

  const getChangeTypeIcon = (changeType: VersionChangeType) => {
    switch (changeType) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-500" />
      case 'updated':
        return <Edit3 className="h-4 w-4 text-primary" />
      case 'replaced':
        return <Upload className="h-4 w-4 text-orange-500" />
      case 'archived':
        return <Archive className="h-4 w-4 text-muted-foreground" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getChangeTypeLabel = (changeType: VersionChangeType) => {
    switch (changeType) {
      case 'created':
        return 'Created'
      case 'updated':
        return 'Updated'
      case 'replaced':
        return 'Replaced'
      case 'archived':
        return 'Archived'
      default:
        return 'Modified'
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Version History</h3>
            <span className="text-sm text-muted-foreground">
              ({versions.length + 1} versions)
            </span>
          </div>
          {onNewVersionUpload && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Upload className="h-3 w-3" />
              <span>Upload New Version</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="p-4 border-b border-border bg-muted/30">
          <h4 className="font-medium text-foreground mb-3">Upload New Version</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                New File *
              </label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                accept="*/*"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Change Description
              </label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                rows={2}
                placeholder="Describe what changed in this version..."
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowUploadForm(false)
                  setUploadFile(null)
                  setUploadDescription('')
                }}
                className="px-3 py-1 border border-border rounded text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleNewVersionUpload}
                disabled={!uploadFile}
                className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
              >
                Upload Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version List */}
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {/* Current Version */}
        <div className="p-4 bg-green-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-foreground">Current Version</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  v{currentFile.version}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={currentFile.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-accent rounded"
                title="View file"
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href={currentFile.file_url}
                download
                className="p-1 hover:bg-accent rounded"
                title="Download file"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>{formatFileSize(currentFile.file_size)}</span>
              <span>•</span>
              <span>Updated {format(new Date(currentFile.updated_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            {currentFile.description && (
              <div className="mt-1 text-foreground">{currentFile.description}</div>
            )}
          </div>
        </div>

        {/* Previous Versions */}
        {versions.map((version, _index) => (
          <div key={version.id} className="p-4 hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getChangeTypeIcon(version.change_type)}
                  <span className="font-medium text-foreground">
                    {getChangeTypeLabel(version.change_type)}
                  </span>
                  <span className="text-sm bg-muted text-muted-foreground px-2 py-1 rounded">
                    v{version.version}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {onVersionRestore && (
                  <button
                    onClick={() => handleVersionRestore(version.id)}
                    className="p-1 hover:bg-accent rounded"
                    title="Restore this version"
                  >
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <a
                  href={version.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-accent rounded"
                  title="View version"
                >
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </a>
                <a
                  href={version.file_url}
                  download
                  className="p-1 hover:bg-accent rounded"
                  title="Download version"
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>{formatFileSize(version.file_size)}</span>
                <span>•</span>
                <span>{format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>by User</span>
                </div>
              </div>
              {version.change_description && (
                <div className="mt-1 text-foreground">{version.change_description}</div>
              )}
            </div>
          </div>
        ))}

        {versions.length === 0 && (
          <div className="p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <h4 className="text-sm font-medium text-foreground">No version history</h4>
            <p className="text-xs text-muted-foreground mt-1">
              This is the first version of this file.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Version Comparison Component
interface VersionCompareProps {
  currentVersion: ProjectFile
  compareVersion: FileVersion
  onClose: () => void
  className?: string
}

export function VersionCompare({
  currentVersion,
  compareVersion,
  onClose,
  className = ''
}: VersionCompareProps) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const sizeDiff = currentVersion.file_size && compareVersion.file_size
    ? currentVersion.file_size - compareVersion.file_size
    : 0

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-medium text-foreground">Version Comparison</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 p-4">
        {/* Current Version */}
        <div className="border border-border rounded p-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-medium">Current (v{currentVersion.version})</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{formatFileSize(currentVersion.file_size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modified:</span>
              <span>{format(new Date(currentVersion.updated_at), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span>{currentVersion.file_type || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Compare Version */}
        <div className="border border-border rounded p-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            <span className="font-medium">Version {compareVersion.version}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{formatFileSize(compareVersion.file_size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(compareVersion.created_at), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change:</span>
              <span>{compareVersion.change_type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Differences */}
      {sizeDiff !== 0 && (
        <div className="px-4 pb-4">
          <div className="border border-border rounded p-3">
            <h4 className="font-medium text-foreground mb-2">Changes</h4>
            <div className="text-sm">
              <span className="text-muted-foreground">File size: </span>
              {sizeDiff > 0 ? (
                <span className="text-green-600">+{formatFileSize(sizeDiff)}</span>
              ) : (
                <span className="text-red-600">{formatFileSize(sizeDiff)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}