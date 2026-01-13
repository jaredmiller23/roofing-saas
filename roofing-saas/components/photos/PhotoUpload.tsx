'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import heic2any from 'heic2any'
import { compressImage } from '@/lib/storage/photos'
import { addPhotoToQueue } from '@/lib/services/photo-queue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { withTimeout } from '@/lib/utils'

// Timeout for HEIC conversion (30 seconds)
const HEIC_CONVERSION_TIMEOUT = 30000

/**
 * Validate HEIC file by checking magic bytes
 * HEIC files have 'ftyp' at offset 4 followed by a valid brand
 */
async function validateHeicFile(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // HEIC files have 'ftyp' at offset 4
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
    if (ftyp !== 'ftyp') return false

    // Valid brands: heic, heix, hevc, hevx, mif1, msf1
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)
  } catch {
    return false
  }
}

interface PhotoUploadProps {
  contactId?: string
  projectId?: string
  tenantId: string
  onUploadSuccess?: (photoId: string) => void
  onUploadError?: (error: string) => void
  mode?: 'immediate' | 'queue' // immediate = upload now, queue = save for later
}

interface UploadState {
  status: 'idle' | 'compressing' | 'uploading' | 'success' | 'error'
  progress: number
  message: string
}

export function PhotoUpload({
  contactId,
  projectId,
  tenantId,
  onUploadSuccess,
  onUploadError,
  mode = 'immediate',
}: PhotoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const cancelledRef = useRef(false)

  // Cancel handler - resets state and sets cancelled flag
  const handleCancel = useCallback(() => {
    cancelledRef.current = true
    setUploadState({ status: 'idle', progress: 0, message: 'Upload cancelled' })
    setPreviewUrl(null)
    // Reset cancelled flag after a short delay so next upload works
    setTimeout(() => {
      cancelledRef.current = false
    }, 100)
  }, [])

  // Validate file type and size
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type (allow image/* and HEIC files)
    const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
    if (!file.type.startsWith('image/') && !isHeic) {
      return { valid: false, error: 'File must be an image (JPEG, PNG, WebP, HEIC, etc.)' }
    }

    // Check file size (20MB limit before compression)
    const maxSizeMB = 20
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
    }

    return { valid: true }
  }, [])

  // Process and upload file
  const processFile = useCallback(
    async (file: File) => {
      // Reset cancelled flag at start of new upload
      cancelledRef.current = false

      try {
        let processedFile = file

        // Helper to check if cancelled
        const checkCancelled = () => {
          if (cancelledRef.current) {
            throw new Error('Upload cancelled')
          }
        }

        // Convert HEIC to JPEG if needed
        const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
        if (isHeic) {
          setUploadState({
            status: 'compressing',
            progress: 10,
            message: 'Validating HEIC file...',
          })

          // Validate HEIC magic bytes before attempting conversion
          const isValidHeic = await validateHeicFile(file)
          if (!isValidHeic) {
            throw new Error('File appears to have an invalid format. It may be corrupted or mislabeled as HEIC.')
          }

          setUploadState({
            status: 'compressing',
            progress: 15,
            message: 'Converting HEIC to JPEG...',
          })

          // Convert with timeout to prevent infinite hang
          const convertedBlob = await withTimeout(
            heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.9,
            }),
            HEIC_CONVERSION_TIMEOUT,
            'HEIC conversion timed out after 30 seconds. The file may be too large or corrupted. Try uploading a smaller image or a different format.'
          )

          // heic2any can return a single blob or array of blobs
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
          processedFile = new File(
            [blob],
            file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
            { type: 'image/jpeg' }
          )
        }

        // Check if cancelled after HEIC conversion
        checkCancelled()

        // Show preview
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(processedFile)

        // Compress image
        setUploadState({
          status: 'compressing',
          progress: 25,
          message: 'Compressing image...',
        })

        const compressed = await compressImage(processedFile)

        setUploadState({
          status: 'compressing',
          progress: 50,
          message: `Compressed ${compressed.compressionRatio}% (${(compressed.originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressed.compressedSize / 1024 / 1024).toFixed(1)}MB)`,
        })

        // Check if cancelled after compression
        checkCancelled()

        // Check if online or offline
        const isOnline = navigator.onLine

        if (mode === 'queue' || !isOnline) {
          // Queue for later upload
          setUploadState({
            status: 'uploading',
            progress: 75,
            message: isOnline ? 'Queueing for upload...' : 'Offline - queueing for later...',
          })

          // Get geolocation if available
          let latitude: number | undefined
          let longitude: number | undefined

          if ('geolocation' in navigator) {
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                  enableHighAccuracy: false
                })
              })
              latitude = position.coords.latitude
              longitude = position.coords.longitude
            } catch {
              console.log('Geolocation not available, continuing without coordinates')
            }
          }

          await addPhotoToQueue(
            compressed.file,
            contactId || '',
            {
              capturedAt: new Date().toISOString(),
              latitude,
              longitude,
              notes: `Original: ${(compressed.originalSize / 1024 / 1024).toFixed(1)}MB, Compressed: ${(compressed.compressedSize / 1024 / 1024).toFixed(1)}MB (${compressed.compressionRatio}% reduction)`,
            },
            tenantId,
            projectId
          )

          setUploadState({
            status: 'success',
            progress: 100,
            message: isOnline ? 'Photo queued for upload' : 'Photo saved - will upload when online',
          })

          // Clear preview after delay
          setTimeout(() => {
            setPreviewUrl(null)
            setUploadState({ status: 'idle', progress: 0, message: '' })
          }, 3000)
        } else {
          // Upload immediately
          setUploadState({
            status: 'uploading',
            progress: 75,
            message: 'Uploading to server...',
          })

          const formData = new FormData()
          formData.append('file', compressed.file, file.name)
          if (contactId) formData.append('contact_id', contactId)
          if (projectId) formData.append('project_id', projectId)
          formData.append(
            'metadata',
            JSON.stringify({
              originalSize: compressed.originalSize,
              compressedSize: compressed.compressedSize,
              compressionRatio: compressed.compressionRatio,
            })
          )

          const response = await fetch('/api/photos/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error?.message || 'Upload failed')
          }

          const result = await response.json()

          // API wraps response in {success, data} format
          const photo = result.data?.photo || result.photo

          setUploadState({
            status: 'success',
            progress: 100,
            message: 'Photo uploaded successfully!',
          })

          if (photo?.id) {
            onUploadSuccess?.(photo.id)
          }

          // Clear preview after delay
          setTimeout(() => {
            setPreviewUrl(null)
            setUploadState({ status: 'idle', progress: 0, message: '' })
          }, 2000)
        }
      } catch (error) {
        // Don't show error if it was a cancellation
        if (cancelledRef.current || (error instanceof Error && error.message === 'Upload cancelled')) {
          return
        }

        console.error('Photo upload error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        setUploadState({
          status: 'error',
          progress: 0,
          message: errorMessage,
        })
        onUploadError?.(errorMessage)
      }
    },
    [contactId, projectId, tenantId, mode, onUploadSuccess, onUploadError]
  )

  // Handle file selection from input (supports multiple files)
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      // Process each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file
        const validation = validateFile(file)
        if (!validation.valid) {
          setUploadState({
            status: 'error',
            progress: 0,
            message: `File ${i + 1}/${files.length}: ${validation.error || 'Invalid file'}`,
          })
          onUploadError?.(validation.error || 'Invalid file')
          continue // Skip invalid files, continue with others
        }

        // Update message for batch progress
        if (files.length > 1) {
          setUploadState({
            status: 'compressing',
            progress: 0,
            message: `Processing file ${i + 1} of ${files.length}...`,
          })
        }

        await processFile(file)
      }

      // Reset the input so the same file(s) can be selected again
      event.target.value = ''
    },
    [validateFile, onUploadError, processFile]
  )

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Camera access error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Could not access camera. Please check permissions.',
      })
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }, [])

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      ctx.drawImage(videoRef.current, 0, 0)

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) resolve(blob)
            else reject(new Error('Could not capture photo'))
          },
          'image/jpeg',
          0.95
        )
      })

      // Create File from blob
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })

      // Stop camera
      stopCamera()

      // Process file
      await processFile(file)
    } catch (error) {
      console.error('Photo capture error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Failed to capture photo',
      })
    }
  }, [stopCamera, processFile])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Photo</CardTitle>
        <CardDescription>
          Take a photo or select from your device. Images will be compressed automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Camera view */}
          {isCameraActive && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-background"
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Capture Photo
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Upload buttons */}
          {!isCameraActive && uploadState.status !== 'uploading' && uploadState.status !== 'compressing' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={startCamera}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Take Photo
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-accent flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
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
                Choose Files
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                style={{ objectFit: 'contain' }}
                className="rounded-lg"
              />
            </div>
          )}

          {/* Upload progress */}
          {(uploadState.status === 'compressing' || uploadState.status === 'uploading') && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{uploadState.message}</p>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success message */}
          {uploadState.status === 'success' && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4">
              {uploadState.message}
            </div>
          )}

          {/* Error message */}
          {uploadState.status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
              {uploadState.message}
            </div>
          )}

          {/* Mode indicator */}
          {mode === 'queue' && uploadState.status === 'idle' && (
            <p className="text-xs text-muted-foreground">
              Photos will be queued and uploaded when you&apos;re back online.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
