'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { compressImage } from '@/lib/storage/photos'
import { addPhotoToQueue } from '@/lib/services/photo-queue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DamageTypeSelector,
  SeveritySelector,
  type DamageType,
  type SeverityLevel,
} from './DamageTypeSelector'

interface ClaimPhotoCaptureProps {
  contactId?: string
  projectId?: string
  claimId?: string
  tenantId: string
  /** Suggested damage type based on inspection checklist */
  suggestedDamageType?: DamageType
  /** Photo order for organizing inspection photos */
  photoOrder?: number
  onUploadSuccess?: (photo: {
    id: string
    damageType?: DamageType
    severity?: SeverityLevel
  }) => void
  onUploadError?: (error: string) => void
  onCancel?: () => void
  /** Mode: immediate uploads now, queue saves for offline */
  mode?: 'immediate' | 'queue'
}

interface UploadState {
  status: 'idle' | 'selecting' | 'compressing' | 'uploading' | 'success' | 'error'
  progress: number
  message: string
}

/**
 * ClaimPhotoCapture - Extended photo capture for insurance claims
 *
 * Extends PhotoUpload with:
 * - Damage type selection
 * - Severity rating
 * - Photo ordering for inspection reports
 * - Claim ID association
 */
export function ClaimPhotoCapture({
  contactId,
  projectId,
  claimId,
  tenantId,
  suggestedDamageType,
  photoOrder,
  onUploadSuccess,
  onUploadError,
  onCancel,
  mode = 'queue',
}: ClaimPhotoCaptureProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [damageType, setDamageType] = useState<DamageType | undefined>(suggestedDamageType)
  const [severity, setSeverity] = useState<SeverityLevel | undefined>()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  // Validate file type and size
  // Windows browsers sometimes don't set file.type correctly — fall back to extension check
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const imageExtensions = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|tiff?|svg)$/i
    const hasImageMime = file.type.startsWith('image/')
    const hasImageExtension = imageExtensions.test(file.name)

    if (!hasImageMime && !hasImageExtension) {
      return { valid: false, error: 'File must be an image (JPEG, PNG, WebP, HEIC, etc.)' }
    }
    const maxSizeMB = 20
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
    }
    return { valid: true }
  }, [])

  // Handle file capture (not upload yet)
  const handleCapture = useCallback(
    async (file: File) => {
      try {
        // Show preview
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)

        setCapturedFile(file)
        setUploadState({
          status: 'selecting',
          progress: 0,
          message: 'Select damage type and severity',
        })
      } catch (error) {
        console.error('Capture error:', error)
        setUploadState({
          status: 'error',
          progress: 0,
          message: 'Failed to process image',
        })
      }
    },
    []
  )

  // Process and upload file
  const processAndUpload = useCallback(async () => {
    if (!capturedFile) return

    try {
      // Compress image
      setUploadState({
        status: 'compressing',
        progress: 25,
        message: 'Compressing image...',
      })

      const compressed = await compressImage(capturedFile)

      setUploadState({
        status: 'compressing',
        progress: 50,
        message: `Compressed ${compressed.compressionRatio}%`,
      })

      const isOnline = navigator.onLine

      if (mode === 'queue' || !isOnline) {
        // Queue for later upload
        setUploadState({
          status: 'uploading',
          progress: 75,
          message: isOnline ? 'Saving photo...' : 'Offline - saving for later...',
        })

        // Get geolocation
        let latitude: number | undefined
        let longitude: number | undefined

        if ('geolocation' in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: true,
              })
            })
            latitude = position.coords.latitude
            longitude = position.coords.longitude
          } catch {
            console.log('Geolocation not available')
          }
        }

        await addPhotoToQueue(
          compressed.file,
          contactId || '',
          {
            capturedAt: new Date().toISOString(),
            latitude,
            longitude,
            notes: JSON.stringify({
              damageType,
              severity,
              photoOrder,
              claimId,
            }),
          },
          tenantId,
          projectId
        )

        setUploadState({
          status: 'success',
          progress: 100,
          message: isOnline ? 'Photo saved' : 'Saved - will upload when online',
        })

        onUploadSuccess?.({
          id: `queued-${Date.now()}`,
          damageType,
          severity,
        })

        // Reset after delay
        setTimeout(() => {
          setPreviewUrl(null)
          setCapturedFile(null)
          setDamageType(suggestedDamageType)
          setSeverity(undefined)
          setUploadState({ status: 'idle', progress: 0, message: '' })
        }, 2000)
      } else {
        // Upload immediately
        setUploadState({
          status: 'uploading',
          progress: 75,
          message: 'Uploading...',
        })

        const formData = new FormData()
        formData.append('file', compressed.file, capturedFile.name)
        if (contactId) formData.append('contact_id', contactId)
        if (projectId) formData.append('project_id', projectId)
        if (claimId) formData.append('claim_id', claimId)
        if (damageType) formData.append('damage_type', damageType)
        if (severity) formData.append('severity', severity)
        if (photoOrder !== undefined) formData.append('photo_order', String(photoOrder))
        formData.append(
          'metadata',
          JSON.stringify({
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
            compressionRatio: compressed.compressionRatio,
            forClaim: true,
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
        const photo = result.data?.photo || result.photo

        setUploadState({
          status: 'success',
          progress: 100,
          message: 'Photo uploaded!',
        })

        onUploadSuccess?.({
          id: photo?.id || `uploaded-${Date.now()}`,
          damageType,
          severity,
        })

        // Reset after delay
        setTimeout(() => {
          setPreviewUrl(null)
          setCapturedFile(null)
          setDamageType(suggestedDamageType)
          setSeverity(undefined)
          setUploadState({ status: 'idle', progress: 0, message: '' })
        }, 2000)
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({
        status: 'error',
        progress: 0,
        message: errorMessage,
      })
      onUploadError?.(errorMessage)
    }
  }, [
    capturedFile,
    contactId,
    projectId,
    claimId,
    tenantId,
    damageType,
    severity,
    photoOrder,
    mode,
    suggestedDamageType,
    onUploadSuccess,
    onUploadError,
  ])

  // Handle file selection from input
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const validation = validateFile(file)
      if (!validation.valid) {
        setUploadState({
          status: 'error',
          progress: 0,
          message: validation.error || 'Invalid file',
        })
        onUploadError?.(validation.error || 'Invalid file')
        return
      }

      await handleCapture(file)
    },
    [validateFile, onUploadError, handleCapture]
  )

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Camera error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Could not access camera. Check permissions.',
      })
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }, [])

  // Cleanup camera stream on unmount to prevent hardware resource leak
  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      ctx.drawImage(videoRef.current, 0, 0)

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

      const file = new File([blob], `claim_${Date.now()}.jpg`, { type: 'image/jpeg' })

      stopCamera()
      await handleCapture(file)
    } catch (error) {
      console.error('Capture error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Failed to capture photo',
      })
    }
  }, [stopCamera, handleCapture])

  // Cancel and reset
  const handleCancel = useCallback(() => {
    stopCamera()
    setPreviewUrl(null)
    setCapturedFile(null)
    setDamageType(suggestedDamageType)
    setSeverity(undefined)
    setUploadState({ status: 'idle', progress: 0, message: '' })
    onCancel?.()
  }, [stopCamera, suggestedDamageType, onCancel])

  const isProcessing =
    uploadState.status === 'compressing' || uploadState.status === 'uploading'
  const canSave = capturedFile && damageType && !isProcessing

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Capture Damage Photo</CardTitle>
        <CardDescription>
          {suggestedDamageType
            ? `Photographing: ${suggestedDamageType.replace('_', ' ')}`
            : 'Select damage type after capture'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Camera view */}
          {isCameraActive && (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-background aspect-video object-cover"
              />
              <div className="flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                >
                  Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-3 border border-border text-muted-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Upload buttons (initial state) */}
          {!isCameraActive && uploadState.status === 'idle' && !previewUrl && (
            <div className="flex flex-col gap-2">
              <button
                onClick={startCamera}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="w-full py-3 border border-border text-muted-foreground rounded-lg hover:bg-accent"
              >
                Choose from Gallery
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif,.bmp,.tiff,.tif"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Preview with damage selection */}
          {previewUrl && uploadState.status === 'selecting' && (
            <div className="space-y-4">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted/30">
                <Image
                  src={previewUrl}
                  alt="Captured damage"
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded-lg"
                />
              </div>

              <DamageTypeSelector value={damageType} onChange={setDamageType} />

              <SeveritySelector value={severity} onChange={setSeverity} />

              <div className="flex gap-2">
                <Button
                  onClick={processAndUpload}
                  disabled={!canSave}
                  variant="success"
                  className="flex-1 py-3"
                >
                  Save Photo
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="px-4 py-3"
                >
                  Retake
                </Button>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          {isProcessing && (
            <div className="space-y-3">
              {previewUrl && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted/30 opacity-75">
                  <Image
                    src={previewUrl}
                    alt="Uploading"
                    fill
                    style={{ objectFit: 'contain' }}
                    className="rounded-lg"
                  />
                </div>
              )}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">{uploadState.message}</p>
            </div>
          )}

          {/* Success */}
          {uploadState.status === 'success' && (
            <Alert variant="success">
              <AlertDescription>{uploadState.message}</AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {uploadState.status === 'error' && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertDescription>{uploadState.message}</AlertDescription>
              </Alert>
              <button
                onClick={handleCancel}
                className="w-full py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
