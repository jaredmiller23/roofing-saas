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
        // API returns {error: {message: "..."}}
        const errorMessage = errorData.error?.message || errorData.error || 'Failed to load photos'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      // API wraps response in {success, data} format
      setPhotos(result.data?.photos || result.photos || [])
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
      if (!confirm('Are you sure you want to delete this photo?')) {
        return
      }

      try {
        const response = await fetch(`/api/photos?id=${photoId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json()
          // API returns {error: {message: "..."}}
          const errorMessage = errorData.error?.message || errorData.error || 'Failed to delete photo'
          throw new Error(errorMessage)
        }

        // Remove from local state
        setPhotos(prev => prev.filter(p => p.id !== photoId))

        // Notify parent
        onPhotoDelete?.(photoId)
      } catch (err: any) {
        console.error('Photo delete error:', err)
        // Extract error message properly
        const errorMessage = err?.message || err?.error || 'Failed to delete photo'
        alert(errorMessage)
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
    }).format(date)
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

        {/* SIMPLE Photo grid that WORKS */}
        {photos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {photos.map((photo, index) => (
              <div key={photo.id} style={{position: 'relative'}}>
                {/* Just the image, no wrappers */}
                <img
                  src={photo.file_url}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'block'
                  }}
                  onClick={() => onPhotoClick?.(photo, index, photos)}
                />

                {/* Simple delete button - always visible */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo.id)
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '6px 12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.95)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.95)'}
                >
                  Delete
                </button>

                {/* Photo date */}
                <div style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {formatDate(photo.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add CSS for hover effect */}
        <style jsx>{`
          .delete-btn:hover {
            opacity: 1 !important;
          }
          div:hover .delete-btn {
            opacity: 1;
          }
        `}</style>
      </CardContent>
    </Card>
  )
}