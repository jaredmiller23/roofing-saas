'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload, Camera, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
    version?: number
  }
}

export function ProjectFileForm({ file }: ProjectFileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'url' | 'upload' | 'mobile'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
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
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setSelectedFile(selectedFile)

      // Auto-fill file name if empty
      if (!formData.file_name) {
        setFormData({ ...formData, file_name: selectedFile.name })
      }

      // Auto-suggest file type and category based on file
      if (selectedFile.type.startsWith('image/')) {
        setFormData(prev => ({
          ...prev,
          file_type: 'photo',
          file_category: prev.file_category || 'photos-before'
        }))
      } else if (selectedFile.type.includes('pdf')) {
        setFormData(prev => ({
          ...prev,
          file_type: 'document',
          file_category: prev.file_category || 'contracts-agreements'
        }))
      }
    }
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
      let fileUrl = formData.file_url

      // Upload file if in upload mode and file is selected
      if (uploadMode === 'upload' && selectedFile) {
        setUploading(true)
        fileUrl = await uploadFile(selectedFile)
        setUploading(false)
      }

      // Validate file URL
      if (!fileUrl) {
        throw new Error('Please provide a file URL or upload a file')
      }

      const url = file
        ? `/api/project-files/${file.id}`
        : '/api/project-files'
      const method = file ? 'PATCH' : 'POST'

      // Convert empty strings to null for UUID fields
      const payload = {
        ...formData,
        file_url: fileUrl,
        project_id: formData.project_id || null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save file')
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
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
              <select
                value={formData.file_type}
                onChange={(e) => setFormData({ ...formData, file_type: e.target.value as FileType })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="photo">Photo</option>
                <option value="document">Document</option>
                <option value="contract">Contract</option>
                <option value="estimate">Estimate</option>
                <option value="invoice">Invoice</option>
                <option value="permit">Permit</option>
                <option value="insurance">Insurance</option>
                <option value="warranty">Warranty</option>
                <option value="specification">Specification</option>
                <option value="other">Other</option>
              </select>
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
                        {selectedFile ? (
                          <span className="font-medium text-primary">{selectedFile.name}</span>
                        ) : (
                          <>
                            Click to upload or drag and drop
                            <br />
                            <span className="text-xs text-muted-foreground">
                              PDF, PNG, JPG, or any document
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
                  />
                </label>
                {uploading && (
                  <p className="mt-2 text-sm text-primary">Uploading file...</p>
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
          {uploading ? 'Uploading...' : loading ? 'Saving...' : file ? 'Update File' : 'Save File'}
        </button>
      </div>
    </form>
  )
}
