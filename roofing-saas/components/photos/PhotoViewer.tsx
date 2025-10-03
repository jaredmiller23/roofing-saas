'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

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

interface PhotoViewerProps {
  photos: Photo[]
  initialIndex?: number
  onClose: () => void
  onDelete?: (photoId: string) => void
}

export function PhotoViewer({ photos, initialIndex = 0, onClose, onDelete }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isLoading, setIsLoading] = useState(true)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  const currentPhoto = photos[currentIndex]

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  // Navigate to previous photo
  const goToPrevious = useCallback(() => {
    setIsLoading(true)
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1))
  }, [photos.length])

  // Navigate to next photo
  const goToNext = useCallback(() => {
    setIsLoading(true)
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0))
  }, [photos.length])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goToPrevious, goToNext])

  // Handle touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  // Handle touch move
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  // Handle touch end
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }

    // Reset
    setTouchStart(null)
    setTouchEnd(null)
  }

  // Handle image load
  const handleImageLoad = () => {
    setIsLoading(false)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
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
    return `${mb.toFixed(2)} MB`
  }

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const response = await fetch(`/api/photos?id=${currentPhoto.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete photo')
      }

      // Notify parent
      onDelete?.(currentPhoto.id)

      // If this is the last photo, close viewer
      if (photos.length === 1) {
        onClose()
      } else {
        // Move to next photo (or previous if at end)
        if (currentIndex === photos.length - 1) {
          goToPrevious()
        } else {
          goToNext()
        }
      }
    } catch (err) {
      console.error('Photo delete error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete photo')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-4">
          <span className="text-sm">
            {currentIndex + 1} / {photos.length}
          </span>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            title="Info"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-600 hover:bg-opacity-20 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={currentPhoto.file_url}
            alt={`Photo ${currentIndex + 1}`}
            fill
            style={{ objectFit: 'contain' }}
            onLoad={handleImageLoad}
          />
        </div>

        {/* Navigation buttons (desktop) */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-all hidden sm:block"
              title="Previous"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-all hidden sm:block"
              title="Next"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="p-4 bg-black bg-opacity-90 text-white space-y-2 text-sm">
          <div>
            <span className="text-gray-400">Uploaded:</span>{' '}
            <span>{formatDate(currentPhoto.created_at)}</span>
          </div>

          {currentPhoto.metadata?.compressedSize && (
            <div>
              <span className="text-gray-400">Size:</span>{' '}
              <span>{formatSize(currentPhoto.metadata.compressedSize)}</span>
              {currentPhoto.metadata.compressionRatio && (
                <span className="text-green-400 ml-2">
                  (Compressed {currentPhoto.metadata.compressionRatio}%)
                </span>
              )}
            </div>
          )}

          {currentPhoto.metadata?.originalSize && currentPhoto.metadata?.compressedSize && (
            <div>
              <span className="text-gray-400">Original size:</span>{' '}
              <span>{formatSize(currentPhoto.metadata.originalSize)}</span>
            </div>
          )}

          <div>
            <span className="text-gray-400">ID:</span>{' '}
            <span className="font-mono text-xs">{currentPhoto.id}</span>
          </div>
        </div>
      )}

      {/* Mobile swipe hint */}
      {photos.length > 1 && (
        <div className="p-2 text-center text-gray-400 text-xs sm:hidden">
          Swipe left or right to navigate
        </div>
      )}
    </div>
  )
}
