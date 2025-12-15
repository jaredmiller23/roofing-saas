'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Check,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Folder
} from 'lucide-react'
import { RoofingFileCategory, MobileUploadOptions, FileUploadResult } from '@/lib/types/file'
import { FileCategories } from './FileCategories'

interface MobileFileUploadProps {
  projectId?: string
  onUploadComplete?: (result: FileUploadResult) => void
  onCancel?: () => void
  defaultOptions?: Partial<MobileUploadOptions>
  className?: string
}

export function MobileFileUpload({
  projectId,
  onUploadComplete,
  onCancel,
  defaultOptions = {},
  className = ''
}: MobileFileUploadProps) {
  const [uploadMode, setUploadMode] = useState<'camera' | 'gallery' | 'file'>('camera')
  const [capturedImages, setCapturedImages] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'capture' | 'review' | 'categorize'>('capture')

  // Form data
  const [category, setCategory] = useState<RoofingFileCategory | null>('photos-before')
  const [description, setDescription] = useState('')
  const [folderPath, setFolderPath] = useState<string>('')

  // Camera/preview refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  // Upload options
  const options: MobileUploadOptions = {
    use_camera: true,
    compress_image: true,
    max_file_size: 10 * 1024 * 1024, // 10MB
    allowed_types: ['image/*', '.pdf', '.doc', '.docx'],
    auto_categorize: true,
    ...defaultOptions
  }

  // Initialize camera on mount
  useEffect(() => {
    if (uploadMode === 'camera' && currentStep === 'capture') {
      initializeCamera()
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadMode, currentStep, facingMode])

  const initializeCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.')
      console.error('Camera initialization failed:', err)
    }
  }

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `photo-${timestamp}.jpg`
        const file = new File([blob], filename, { type: 'image/jpeg' })

        setCapturedImages(prev => [...prev, file])
      }
    }, 'image/jpeg', 0.8) // Compress to 80% quality
  }, [])

  const compressImage = async (file: File): Promise<File> => {
    if (!options.compress_image || !file.type.startsWith('image/')) {
      return file
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (max 1920px width)
        const maxWidth = 1920
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.7 // 70% quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []

    for (const file of fileArray) {
      // Check file size
      if (options.max_file_size && file.size > options.max_file_size) {
        setError(`File ${file.name} is too large. Maximum size is ${options.max_file_size / (1024 * 1024)}MB.`)
        continue
      }

      // Compress if image
      const processedFile = await compressImage(file)
      validFiles.push(processedFile)
    }

    setSelectedFiles(validFiles)
    setCurrentStep('review')
  }

  const removeFile = (index: number, isCamera: boolean = false) => {
    if (isCamera) {
      setCapturedImages(prev => prev.filter((_, i) => i !== index))
    } else {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }
  }

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return null
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-primary" />
    }
    return <FileText className="h-8 w-8 text-muted-foreground" />
  }

  const _autoSuggestCategory = (files: File[]): RoofingFileCategory => {
    // Auto-suggest category based on file types
    const hasImages = files.some(f => f.type.startsWith('image/'))
    const hasDocs = files.some(f => f.type.includes('pdf') || f.type.includes('doc'))

    if (hasImages && !hasDocs) {
      return 'photos-before' // Default photo category
    }
    if (hasDocs && !hasImages) {
      return 'contracts-agreements' // Default document category
    }
    return 'other'
  }

  const handleUpload = async () => {
    const filesToUpload = [...capturedImages, ...selectedFiles]
    if (filesToUpload.length === 0) {
      setError('Please select at least one file to upload.')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const results: FileUploadResult[] = []

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        setUploadProgress(((i + 1) / filesToUpload.length) * 100)

        // Create form data
        const formData = new FormData()
        formData.append('file', file)
        formData.append('file_name', file.name)
        formData.append('file_type', file.type.startsWith('image/') ? 'photo' : 'document')
        formData.append('file_category', category || 'other')
        formData.append('description', description)
        formData.append('folder_path', folderPath)
        if (projectId) {
          formData.append('project_id', projectId)
        }

        // Upload file
        const response = await fetch('/api/project-files/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`)
        }

        const result = await response.json()
        results.push({ success: true, file: result.file })
      }

      // Notify completion
      if (onUploadComplete) {
        // Return summary result
        onUploadComplete({
          success: true,
          file: results[0]?.file,
          upload_progress: 100
        })
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (currentStep === 'capture') {
    return (
      <div className={`bg-background min-h-screen ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Upload Files</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Mode Selection */}
        <div className="flex bg-card border-b border-border">
          <button
            onClick={() => setUploadMode('camera')}
            className={`flex-1 flex items-center justify-center py-3 text-sm font-medium ${
              uploadMode === 'camera'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </button>
          <button
            onClick={() => setUploadMode('gallery')}
            className={`flex-1 flex items-center justify-center py-3 text-sm font-medium ${
              uploadMode === 'gallery'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Gallery
          </button>
          <button
            onClick={() => setUploadMode('file')}
            className={`flex-1 flex items-center justify-center py-3 text-sm font-medium ${
              uploadMode === 'file'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Files
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative">
          {uploadMode === 'camera' && (
            <div className="relative h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-6">
                <button
                  onClick={switchCamera}
                  className="p-3 bg-black/50 text-primary-foreground rounded-full hover:bg-black/70"
                >
                  <RotateCw className="h-5 w-5" />
                </button>

                <button
                  onClick={capturePhoto}
                  className="p-4 bg-card border-4 border-primary rounded-full hover:bg-muted"
                >
                  <Camera className="h-6 w-6 text-primary" />
                </button>

                <button
                  onClick={() => setCurrentStep('review')}
                  disabled={capturedImages.length === 0}
                  className="p-3 bg-green-500 text-primary-foreground rounded-full hover:bg-green-600 disabled:opacity-50"
                >
                  <Check className="h-5 w-5" />
                </button>
              </div>

              {/* Image Count */}
              {capturedImages.length > 0 && (
                <div className="absolute top-4 right-4 bg-black/50 text-primary-foreground px-2 py-1 rounded">
                  {capturedImages.length} photo{capturedImages.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {(uploadMode === 'gallery' || uploadMode === 'file') && (
            <div className="p-4 h-full flex flex-col items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={uploadMode === 'gallery' ? 'image/*' : options.allowed_types?.join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />

              <div className="text-center">
                {uploadMode === 'gallery' ? (
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                ) : (
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  {uploadMode === 'gallery' ? 'Select Photos' : 'Select Files'}
                </button>

                <p className="text-sm text-muted-foreground mt-2">
                  {uploadMode === 'gallery'
                    ? 'Choose photos from your device'
                    : 'Choose documents, PDFs, or other files'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (currentStep === 'review') {
    const allFiles = [...capturedImages, ...selectedFiles]

    return (
      <div className={`bg-background min-h-screen ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card border-b border-border">
          <button
            onClick={() => setCurrentStep('capture')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            Review Files ({allFiles.length})
          </h2>
          <button
            onClick={() => setCurrentStep('categorize')}
            disabled={allFiles.length === 0}
            className="text-primary hover:text-primary/80 disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        {/* File List */}
        <div className="p-4 space-y-3">
          {allFiles.map((file, index) => {
            const isCamera = index < capturedImages.length
            const previewUrl = getFilePreview(file)

            return (
              <div key={index} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt={file.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-muted rounded border">
                      {getFileIcon(file)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(isCamera ? index : index - capturedImages.length, isCamera)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {allFiles.length === 0 && (
          <div className="p-8 text-center">
            <Folder className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No files selected</p>
          </div>
        )}
      </div>
    )
  }

  // Categorize step
  return (
    <div className={`bg-background min-h-screen ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <button
          onClick={() => setCurrentStep('review')}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-foreground">File Details</h2>
        <div /> {/* Spacer */}
      </div>

      {/* Form */}
      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Category *
          </label>
          <FileCategories
            selectedCategory={category}
            onCategoryChange={setCategory}
            showAllOption={false}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add a description for these files..."
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Folder (optional)
          </label>
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="e.g., /Photos/Before"
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !category}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Uploading... {Math.round(uploadProgress)}%</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Upload {[...capturedImages, ...selectedFiles].length} files</span>
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}