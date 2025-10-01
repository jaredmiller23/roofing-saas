'use client'

import { useState, useCallback } from 'react'
import { PhotoUpload } from './PhotoUpload'
import { PhotoGallery } from './PhotoGallery'
import { PhotoViewer } from './PhotoViewer'

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

interface PhotoManagerProps {
  contactId?: string
  projectId?: string
  tenantId: string
  uploadMode?: 'immediate' | 'queue'
  showUpload?: boolean
  showGallery?: boolean
}

/**
 * PhotoManager - Integrated component for photo upload, gallery, and viewing
 *
 * This component combines all photo functionality in one place:
 * - Upload photos with camera or file picker
 * - View photos in a grid
 * - Full-screen photo viewer with swipe
 * - Offline support with sync queue
 */
export function PhotoManager({
  contactId,
  projectId,
  tenantId,
  uploadMode = 'immediate',
  showUpload = true,
  showGallery = true,
}: PhotoManagerProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerPhotos, setViewerPhotos] = useState<Photo[]>([])
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Handle photo upload success
  const handleUploadSuccess = useCallback((photoId: string) => {
    // Trigger gallery refresh
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Handle photo click in gallery
  const handlePhotoClick = useCallback((photo: Photo, index: number, allPhotos: Photo[]) => {
    setViewerPhotos(allPhotos)
    setViewerInitialIndex(index)
    setViewerOpen(true)
  }, [])

  // Handle photo delete in viewer
  const handlePhotoDelete = useCallback((photoId: string) => {
    // Remove from viewer photos
    setViewerPhotos(prev => prev.filter(p => p.id !== photoId))

    // Trigger gallery refresh
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Handle viewer close
  const handleViewerClose = useCallback(() => {
    setViewerOpen(false)

    // Trigger gallery refresh to reflect any deletes
    setRefreshTrigger(prev => prev + 1)
  }, [])

  return (
    <div className="space-y-6">
      {/* Upload section */}
      {showUpload && (
        <PhotoUpload
          contactId={contactId}
          projectId={projectId}
          tenantId={tenantId}
          mode={uploadMode}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={error => console.error('Upload error:', error)}
        />
      )}

      {/* Gallery section */}
      {showGallery && (
        <PhotoGallery
          contactId={contactId}
          projectId={projectId}
          onPhotoClick={handlePhotoClick}
          onPhotoDelete={handlePhotoDelete}
          key={refreshTrigger} // Force re-render on refresh
        />
      )}

      {/* Viewer overlay */}
      {viewerOpen && viewerPhotos.length > 0 && (
        <PhotoViewer
          photos={viewerPhotos}
          initialIndex={viewerInitialIndex}
          onClose={handleViewerClose}
          onDelete={handlePhotoDelete}
        />
      )}
    </div>
  )
}
