'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { FileText, Upload, Camera, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RoofingFileCategory, FileType, suggestFileTypeForCategory } from '@/lib/types/file'
import { FileCategories, CategoryGrid } from './FileCategories'
import { MobileFileUpload } from './MobileFileUpload'

interface ProjectFileFormProps {
  file?: {
    id: string
    file_name: string
    file_type: string | null
    file_category: string | null
    file_url: string
    description: string | null
    project_id: string | null
    version?: number | null
    [key: string]: unknown
  }
}

export function ProjectFileForm({ file }: ProjectFileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'url' | 'upload' | 'mobile'>('upload')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showMobileUpload, setShowMobileUpload] = useState(false)
  const [categorySelectionMode, setCategorySelectionMode] = useState<'dropdown' | 'grid'>('dropdown')

  const [formData, setFormData] = useState({
    file_name: file?.file_name || '',
    file_type: (file?.file_type as FileType) || 'document' as FileType,
    file_category: (file?.file_category as RoofingFileCategory | null) || null,
    file_url: file?.file_url || '',
    description: file?.description || '',
    project_id: file?.project_id || '',
    folder_path: '',
    version: file?.version || 1,
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setSelectedFiles(prev => [...prev, ...files])

    // Auto-fill file name if empty and single file
    if (!formData.file_name && files.length === 1) {
      setFormData(prev => ({ ...prev, file_name: files[0].name }))
    }

    // Auto-suggest file type and category based on first file
    const firstFile = files[0]
    const isImage = firstFile.type.startsWith('image/') ||
      /\.(heic|heif)$/i.test(firstFile.name)

    if (isImage) {
      setFormData(prev => ({
        ...prev,
        file_type: 'photo',
        file_category: prev.file_category || 'photos-before'
      }))
    } else if (firstFile.type.includes('pdf')) {
      setFormData(prev => ({
        ...prev,
        file_type: 'document',
        file_category: prev.file_category || 'contracts-agreements'
      }))
    }

    // Reset the input so re-selecting the same files works
    e.target.value = ''
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCategoryChange = (category: RoofingFileCategory | null) => {
    setFormData(prev => ({ ...prev, file_category: category }))

    // Auto-suggest file type based on category
    if (category && !file) { // Only for new files
      const suggestedTypes = suggestFileTypeForCategory(category)
      if (suggestedTypes.length > 0) {
        setFormData(prev => ({ ...prev, file_type: suggestedTypes[0] }))
      }
    }
  }

  const handleCategoryGridSelect = (category: RoofingFileCategory) => {
    handleCategoryChange(category)
    setCategorySelectionMode('dropdown') // Switch back to dropdown after selection
  }

  const handleMobileUploadComplete = (result: { success: boolean; file?: { id: string } }) => {
    if (result.success && result.file) {
      // Redirect to file details or files list
      router.push(`/project-files/${result.file.id}`)
    } else {
      setError('Upload failed')
    }
    setShowMobileUpload(false)
  }

  const uploadFile = async (file: File): Promise<string> => {
    const supabase = createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `project-files/${fileName}`

    const { error } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Edit mode — single file, existing behavior
      if (file) {
        let fileUrl = formData.file_url

        if (uploadMode === 'upload' && selectedFiles.length > 0) {
          setUploading(true)
          fileUrl = await uploadFile(selectedFiles[0])
          setUploading(false)
        }

        if (!fileUrl) {
          throw new Error('Please provide a file URL or upload a file')
        }

        const payload = {
          ...formData,
          file_url: fileUrl,
          project_id: formData.project_id || null,
        }

        const response = await fetch(`/api/project-files/${file.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to save file')
        }
      }
      // Create mode with file upload — uses server route for HEIC conversion
      else if (uploadMode === 'upload' && selectedFiles.length > 0) {
        setUploading(true)

        for (const selectedFile of selectedFiles) {
          const uploadFormData = new FormData()
          uploadFormData.append('file', selectedFile)
          uploadFormData.append('file_name', selectedFiles.length === 1 ? (formData.file_name || selectedFile.name) : selectedFile.name)
          uploadFormData.append('file_type', formData.file_type)
          if (formData.file_category) uploadFormData.append('file_category', formData.file_category)
          uploadFormData.append('description', formData.description)
          if (formData.project_id) uploadFormData.append('project_id', formData.project_id)
          if (formData.folder_path) uploadFormData.append('folder_path', formData.folder_path)

          const response = await fetch('/api/project-files/upload', {
            method: 'POST',
            body: uploadFormData,
          })

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Upload failed' }))
            throw new Error(err.error || `Failed to upload ${selectedFile.name}`)
          }
        }

        setUploading(false)
      }
      // Create mode with URL
      else if (uploadMode === 'url') {
        if (!formData.file_url) {
          throw new Error('Please provide a file URL')
        }

        const payload = {
          ...formData,
          project_id: formData.project_id || null,
        }

        const response = await fetch('/api/project-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to save file')
        }
      } else {
        throw new Error('Please select files or enter a URL')
      }

      router.push('/project-files')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  // Show mobile upload if requested
  if (showMobileUpload) {
    return (
      <MobileFileUpload
        projectId={formData.project_id}
        onUploadComplete={handleMobileUploadComplete}
        onCancel={() => setShowMobileUpload(false)}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Upload Options */}
      {!file && (
        <div className="bg-card shadow-sm rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">Quick Upload</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setShowMobileUpload(true)}
              className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-primary rounded-lg hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Camera Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setCategorySelectionMode('grid')}
              className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Browse Categories</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('upload')}
              className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Standard Upload</span>
            </button>
          </div>
        </div>
      )}

      {/* Category Selection Grid */}
      {categorySelectionMode === 'grid' && (
        <div className="bg-card shadow-sm rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">Select File Category</h3>
            <button
              type="button"
              onClick={() => setCategorySelectionMode('dropdown')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              × Close
            </button>
          </div>
          <CategoryGrid
            onCategorySelect={handleCategoryGridSelect}
            selectedCategories={formData.file_category ? [formData.file_category] : []}
            mode="single"
          />
        </div>
      )}

      {/* File Details */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">File Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              File Name *
            </label>
            <input
              type="text"
              required
              value={formData.file_name}
              onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                File Type
              </label>
              <Select
                value={formData.file_type}
                onValueChange={(value) => setFormData({ ...formData, file_type: value as FileType })}
              >
                <SelectTrigger className="w-full" aria-label="File type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="estimate">Estimate</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="warranty">Warranty</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Category *
              </label>
              <FileCategories
                selectedCategory={formData.file_category}
                onCategoryChange={handleCategoryChange}
                showAllOption={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Folder Path
            </label>
            <input
              type="text"
              value={formData.folder_path}
              onChange={(e) => setFormData({ ...formData, folder_path: e.target.value })}
              placeholder="e.g., /Photos/Before or leave empty for root"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Organize files in folders. Use forward slashes to create subfolders.
            </p>
          </div>

          {/* Upload Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              File Source *
            </label>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setUploadMode('upload')}
                className={`flex-1 px-4 py-2 rounded-md font-medium ${
                  uploadMode === 'upload'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
              >
                <Upload className="inline h-4 w-4 mr-2" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 px-4 py-2 rounded-md font-medium ${
                  uploadMode === 'url'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileText className="inline h-4 w-4 mr-2" />
                Enter URL
              </button>
            </div>

            {uploadMode === 'upload' ? (
              <div>
                <label className="block w-full">
                  <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md hover:border-primary cursor-pointer bg-muted hover:bg-muted/80 transition">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedFiles.length > 0 ? (
                          <span className="font-medium text-primary">
                            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected — click to add more
                          </span>
                        ) : (
                          <>
                            Click to select files or drag and drop
                            <br />
                            <span className="text-xs text-muted-foreground">
                              PDF, PNG, JPG, HEIC, or any document — select multiple
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="*/*"
                    multiple
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {selectedFiles.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center justify-between px-3 py-1.5 bg-muted/50 rounded text-sm">
                        <span className="text-foreground truncate mr-2">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          aria-label={`Remove ${f.name}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {uploading && (
                  <p className="mt-2 text-sm text-primary">Uploading files...</p>
                )}
              </div>
            ) : (
              <input
                type="url"
                required={uploadMode === 'url'}
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="File description..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {uploading ? `Uploading${selectedFiles.length > 1 ? ` (${selectedFiles.length} files)` : ''}...` : loading ? 'Saving...' : file ? 'Update File' : selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Files` : 'Save File'}
        </button>
      </div>
    </form>
  )
}
