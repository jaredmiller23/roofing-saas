'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProjectFileFormProps {
  file?: {
    id: string
    file_name: string
    file_type: string | null
    file_category: string | null
    file_url: string
    description: string | null
    project_id: string | null
  }
}

export function ProjectFileForm({ file }: ProjectFileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    file_name: file?.file_name || '',
    file_type: file?.file_type || 'document',
    file_category: file?.file_category || '',
    file_url: file?.file_url || '',
    description: file?.description || '',
    project_id: file?.project_id || '',
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-fill file name if empty
      if (!formData.file_name) {
        setFormData({ ...formData, file_name: file.name })
      }
    }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* File Details */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                File Type
              </label>
              <select
                value={formData.file_type}
                onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="photo">Photo</option>
                <option value="document">Document</option>
                <option value="contract">Contract</option>
                <option value="estimate">Estimate</option>
                <option value="invoice">Invoice</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.file_category}
                onChange={(e) => setFormData({ ...formData, file_category: e.target.value })}
                placeholder="e.g., before, after, damage"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-muted-foreground hover:bg-muted'
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileText className="inline h-4 w-4 mr-2" />
                Enter URL
              </button>
            </div>

            {uploadMode === 'upload' ? (
              <div>
                <label className="block w-full">
                  <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedFile ? (
                          <span className="font-medium text-blue-600">{selectedFile.name}</span>
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
                  <p className="mt-2 text-sm text-blue-600">Uploading file...</p>
                )}
              </div>
            ) : (
              <input
                type="url"
                required={uploadMode === 'url'}
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-4 py-2 border border-gray-300 rounded-md text-muted-foreground hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : loading ? 'Saving...' : file ? 'Update File' : 'Save File'}
        </button>
      </div>
    </form>
  )
}
