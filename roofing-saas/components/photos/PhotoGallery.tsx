'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Photo {
  id: string
  file_url: string
  thumbnail_url?: string
  metadata?: {
    originalSize?: number
    compressedSize?: number
    compressionRatio?: number
  }
  created_at: string
  contact_id?: string
  project_id?: string
}

interface PhotoGalleryProps {
  contactId?: string
  projectId?: string
  onPhotoClick?: (photo: Photo, index: number, allPhotos: Photo[]) => void
  onPhotoDelete?: (photoId: string) => void
  autoLoad?: boolean
}

export function PhotoGallery({
  contactId,
  projectId,
  onPhotoClick,
  onPhotoDelete,
  autoLoad = true,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (contactId) params.append('contact_id', contactId)
      if (projectId) params.append('project_id', projectId)
      params.append('limit', '50')

      const response = await fetch(`/api/photos?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load photos')
      }

      const result = await response.json()
      setPhotos(result.photos || [])
    } catch (err) {
      console.error('Photo fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load photos')
    } finally {
      setLoading(false)
    }
  }, [contactId, projectId])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      fetchPhotos()
    }
  }, [autoLoad, fetchPhotos])

  // Handle photo deletion
  const handleDelete = useCallback(
    async (photoId: string) => {
      try {
        const response = await fetch(`/api/photos?id=${photoId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete photo')
        }

        // Remove from local state
        setPhotos(prev => prev.filter(p => p.id !== photoId))
        setDeleteConfirm(null)

        // Notify parent
        onPhotoDelete?.(photoId)
      } catch (err) {
        console.error('Photo delete error:', err)
        alert(err instanceof Error ? err.message : 'Failed to delete photo')
      }
    },
    [onPhotoDelete]
  )

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Photos ({photos.length})</CardTitle>
            <CardDescription>
              {contactId && 'Photos for this contact'}
              {projectId && 'Photos for this project'}
              {!contactId && !projectId && 'All photos'}
            </CardDescription>
          </div>
          <button
            onClick={fetchPhotos}
            disabled={loading}
            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && photos.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty state */}
        {!loading && photos.length === 0 && !error && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No photos yet</p>
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative group">
                {/* Photo thumbnail */}
                <div
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => onPhotoClick?.(photo, index, photos)}
                >
                  <img
                    src={photo.thumbnail_url || photo.file_url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity rounded-lg flex items-end">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 w-full">
                    {/* Delete button */}
                    {deleteConfirm === photo.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleDelete(photo.id)
                          }}
                          className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setDeleteConfirm(null)
                          }}
                          className="flex-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setDeleteConfirm(photo.id)
                        }}
                        className="w-full px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Photo info */}
                <div className="mt-1 text-xs text-gray-500 truncate">
                  {formatDate(photo.created_at)}
                </div>

                {/* Compression info (if available) */}
                {photo.metadata?.compressionRatio && (
                  <div className="text-xs text-gray-400 truncate">
                    {formatSize(photo.metadata.compressedSize)}
                    <span className="text-green-600 ml-1">
                      (-{photo.metadata.compressionRatio}%)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
