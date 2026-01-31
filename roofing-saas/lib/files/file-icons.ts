import {
  FileText,
  Image as ImageIcon,
  File,
  FileSpreadsheet,
  FileType2,
  Shield,
  Receipt,
  ClipboardCheck,
  Award,
  Layers,
  FileSignature,
  type LucideIcon,
} from 'lucide-react'

export interface FileIconResult {
  icon: LucideIcon
  label: string
}

/**
 * Map a file to an appropriate Lucide icon based on its properties.
 * Resolution priority: MIME type → file extension → file category → default.
 */
export function getFileIcon(
  mimeType?: string | null,
  fileCategory?: string | null,
  fileExtension?: string | null
): FileIconResult {
  // Priority 1: MIME type (most reliable)
  if (mimeType) {
    if (mimeType.startsWith('image/')) return { icon: ImageIcon, label: 'Image' }
    if (mimeType === 'application/pdf') return { icon: FileText, label: 'PDF' }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
      return { icon: FileSpreadsheet, label: 'Spreadsheet' }
    if (
      mimeType.includes('wordprocessingml') ||
      mimeType === 'application/msword' ||
      mimeType === 'application/rtf'
    )
      return { icon: FileType2, label: 'Document' }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
      return { icon: FileText, label: 'Presentation' }
    if (mimeType.startsWith('text/')) return { icon: FileText, label: 'Text' }
  }

  // Priority 2: File extension
  if (fileExtension) {
    const ext = fileExtension.toLowerCase().replace(/^\./, '')
    const extMap: Record<string, FileIconResult> = {
      pdf: { icon: FileText, label: 'PDF' },
      doc: { icon: FileType2, label: 'Word' },
      docx: { icon: FileType2, label: 'Word' },
      xls: { icon: FileSpreadsheet, label: 'Excel' },
      xlsx: { icon: FileSpreadsheet, label: 'Excel' },
      csv: { icon: FileSpreadsheet, label: 'CSV' },
      ppt: { icon: FileText, label: 'PowerPoint' },
      pptx: { icon: FileText, label: 'PowerPoint' },
      jpg: { icon: ImageIcon, label: 'JPEG' },
      jpeg: { icon: ImageIcon, label: 'JPEG' },
      png: { icon: ImageIcon, label: 'PNG' },
      gif: { icon: ImageIcon, label: 'GIF' },
      webp: { icon: ImageIcon, label: 'WebP' },
      heic: { icon: ImageIcon, label: 'HEIC' },
      txt: { icon: FileText, label: 'Text' },
      rtf: { icon: FileType2, label: 'Rich Text' },
    }
    if (extMap[ext]) return extMap[ext]
  }

  // Priority 3: File category (roofing-domain semantic icons)
  if (fileCategory) {
    const catMap: Record<string, FileIconResult> = {
      'contracts-agreements': { icon: FileSignature, label: 'Contract' },
      'insurance-documents': { icon: Shield, label: 'Insurance' },
      'invoices-estimates': { icon: Receipt, label: 'Invoice' },
      'permits-inspections': { icon: ClipboardCheck, label: 'Permit' },
      'warranty-documents': { icon: Award, label: 'Warranty' },
      'material-specs': { icon: Layers, label: 'Specification' },
    }
    if (catMap[fileCategory]) return catMap[fileCategory]
  }

  // Default
  return { icon: File, label: 'File' }
}
