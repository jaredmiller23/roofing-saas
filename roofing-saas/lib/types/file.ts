/**
 * File management system types for roofing contractor application
 */

// Base file type categories
export type FileType =
  | 'photo'
  | 'document'
  | 'contract'
  | 'estimate'
  | 'invoice'
  | 'permit'
  | 'insurance'
  | 'warranty'
  | 'specification'
  | 'other'

// Roofing-specific file categories
export type RoofingFileCategory =
  | 'contracts-agreements'
  | 'photos-before'
  | 'photos-during'
  | 'photos-after'
  | 'photos-damage'
  | 'permits-inspections'
  | 'invoices-estimates'
  | 'insurance-documents'
  | 'insurance-estimate'    // Insurance company's estimate/scope
  | 'warranty-documents'
  | 'material-specs'
  | 'measurements'          // Measurement reports (EagleView, hover, etc.)
  | 'job-submission'        // Job submission form for production
  | 'other'

// File status for versioning
export type FileStatus = 'active' | 'archived' | 'deleted'

// Version change type
export type VersionChangeType = 'created' | 'updated' | 'replaced' | 'archived'

// Base project file interface
export interface ProjectFile {
  id: string
  file_name: string
  file_type: FileType | null
  file_category: RoofingFileCategory | null
  file_url: string
  thumbnail_url?: string | null
  file_size: number | null
  file_extension?: string | null
  mime_type?: string | null
  project_id: string | null
  contact_id?: string | null
  folder_path?: string | null  // For folder hierarchy: /folder1/subfolder2
  description: string | null
  tenant_id: string
  uploaded_by: string
  status: FileStatus
  version: number
  parent_file_id?: string | null  // For versioning - points to original file
  created_at: string
  updated_at: string
  is_deleted: boolean
  metadata?: Record<string, unknown>  // For storing additional file properties
}

// File version history
export interface FileVersion {
  id: string
  file_id: string
  version: number
  file_url: string
  file_size: number | null
  change_type: VersionChangeType
  change_description?: string | null
  created_by: string
  created_at: string
  metadata?: Record<string, unknown>
}

// Folder structure
export interface FileFolder {
  id: string
  name: string
  parent_folder_id?: string | null
  project_id: string
  path: string  // Full path like /folder1/subfolder2
  tenant_id: string
  created_by: string
  created_at: string
  updated_at: string
}

// File search filters
export interface FileSearchFilters {
  file_type?: FileType[]
  file_category?: RoofingFileCategory[]
  project_id?: string
  folder_path?: string
  search_term?: string  // Search in file name, description
  date_from?: string
  date_to?: string
  uploaded_by?: string
  file_size_min?: number
  file_size_max?: number
  has_versions?: boolean
}

// Bulk operation types
export type BulkFileOperation =
  | 'move_to_folder'
  | 'change_category'
  | 'change_type'
  | 'delete'
  | 'archive'
  | 'download_zip'

export interface BulkFileActionData {
  file_ids: string[]
  operation: BulkFileOperation
  target_folder_path?: string
  new_category?: RoofingFileCategory
  new_type?: FileType
}

// Mobile upload specific types
export interface MobileUploadOptions {
  use_camera: boolean
  compress_image: boolean
  max_file_size?: number
  allowed_types?: string[]
  auto_categorize?: boolean
}

// File upload result
export interface FileUploadResult {
  success: boolean
  file?: ProjectFile
  error?: string
  upload_progress?: number
}

// File tree node for folder hierarchy display
export interface FileTreeNode {
  id: string
  name: string
  type: 'folder' | 'file'
  path: string
  children?: FileTreeNode[]
  file_data?: ProjectFile  // Only for file nodes
  folder_data?: FileFolder  // Only for folder nodes
}

// Category display configuration
export interface FileCategoryConfig {
  value: RoofingFileCategory
  label: string
  description: string
  icon?: string
  color?: string
  suggested_types?: FileType[]
}

// File operation permissions
export interface FilePermissions {
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_manage_versions: boolean
  can_bulk_operations: boolean
  can_create_folders: boolean
}

// API response types
export interface FileListResponse {
  files: ProjectFile[]
  total: number
  page: number
  limit: number
  has_more: boolean
  folders?: FileFolder[]
}

export interface FileVersionListResponse {
  versions: FileVersion[]
  current_version: ProjectFile
  total_versions: number
}

export interface FileSearchResponse extends FileListResponse {
  search_term?: string
  filters_applied: FileSearchFilters
}

// Constants for file categories
export const ROOFING_FILE_CATEGORIES: FileCategoryConfig[] = [
  {
    value: 'contracts-agreements',
    label: 'Contracts & Agreements',
    description: 'Contracts, work orders, agreements',
    icon: 'FileText',
    color: 'green',
    suggested_types: ['contract', 'document']
  },
  {
    value: 'photos-before',
    label: 'Before Photos',
    description: 'Photos taken before work begins',
    icon: 'Camera',
    color: 'blue',
    suggested_types: ['photo']
  },
  {
    value: 'photos-during',
    label: 'Progress Photos',
    description: 'Photos during construction/repair',
    icon: 'Camera',
    color: 'yellow',
    suggested_types: ['photo']
  },
  {
    value: 'photos-after',
    label: 'Completion Photos',
    description: 'Final photos after work completion',
    icon: 'Camera',
    color: 'purple',
    suggested_types: ['photo']
  },
  {
    value: 'photos-damage',
    label: 'Damage Photos',
    description: 'Documentation of damage or issues',
    icon: 'AlertTriangle',
    color: 'red',
    suggested_types: ['photo']
  },
  {
    value: 'permits-inspections',
    label: 'Permits & Inspections',
    description: 'Building permits, inspection reports',
    icon: 'ClipboardCheck',
    color: 'indigo',
    suggested_types: ['permit', 'document']
  },
  {
    value: 'invoices-estimates',
    label: 'Invoices & Estimates',
    description: 'Financial documents, pricing',
    icon: 'DollarSign',
    color: 'emerald',
    suggested_types: ['invoice', 'estimate']
  },
  {
    value: 'insurance-documents',
    label: 'Insurance Documents',
    description: 'Insurance claims, adjuster reports',
    icon: 'Shield',
    color: 'orange',
    suggested_types: ['insurance', 'document']
  },
  {
    value: 'insurance-estimate',
    label: 'Insurance Estimate',
    description: 'Insurance company scope/estimate document',
    icon: 'FileSpreadsheet',
    color: 'amber',
    suggested_types: ['estimate', 'document']
  },
  {
    value: 'warranty-documents',
    label: 'Warranty Documents',
    description: 'Product warranties, service guarantees',
    icon: 'Award',
    color: 'cyan',
    suggested_types: ['warranty', 'document']
  },
  {
    value: 'material-specs',
    label: 'Material Specifications',
    description: 'Product specifications, technical docs',
    icon: 'Layers',
    color: 'slate',
    suggested_types: ['specification', 'document']
  },
  {
    value: 'measurements',
    label: 'Measurement Report',
    description: 'Roof measurements (EagleView, Hover, etc.)',
    icon: 'Ruler',
    color: 'teal',
    suggested_types: ['document', 'specification']
  },
  {
    value: 'job-submission',
    label: 'Job Submission Form',
    description: 'Production job submission documentation',
    icon: 'ClipboardList',
    color: 'violet',
    suggested_types: ['document']
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Miscellaneous files',
    icon: 'Folder',
    color: 'gray',
    suggested_types: ['other']
  }
]

// File type display labels
export const FILE_TYPE_LABELS: Record<FileType, string> = {
  photo: 'Photo',
  document: 'Document',
  contract: 'Contract',
  estimate: 'Estimate',
  invoice: 'Invoice',
  permit: 'Permit',
  insurance: 'Insurance',
  warranty: 'Warranty',
  specification: 'Specification',
  other: 'Other'
}

// Utility function to get category config
export function getCategoryConfig(category: RoofingFileCategory): FileCategoryConfig {
  return ROOFING_FILE_CATEGORIES.find(c => c.value === category) || ROOFING_FILE_CATEGORIES[10]  // Default to 'other'
}

// Utility function to suggest file type based on category
export function suggestFileTypeForCategory(category: RoofingFileCategory): FileType[] {
  const config = getCategoryConfig(category)
  return config.suggested_types || ['other']
}