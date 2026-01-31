import { describe, it, expect } from 'vitest'
import { getFileIcon } from '@/lib/files/file-icons'
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
} from 'lucide-react'

describe('getFileIcon', () => {
  describe('MIME type resolution (Priority 1)', () => {
    it('returns ImageIcon for image MIME types', () => {
      expect(getFileIcon('image/jpeg').icon).toBe(ImageIcon)
      expect(getFileIcon('image/png').icon).toBe(ImageIcon)
      expect(getFileIcon('image/webp').icon).toBe(ImageIcon)
      expect(getFileIcon('image/gif').icon).toBe(ImageIcon)
      expect(getFileIcon('image/heic').icon).toBe(ImageIcon)
      expect(getFileIcon('image/svg+xml').icon).toBe(ImageIcon)
    })

    it('returns FileText for PDF', () => {
      const result = getFileIcon('application/pdf')
      expect(result.icon).toBe(FileText)
      expect(result.label).toBe('PDF')
    })

    it('returns FileSpreadsheet for spreadsheet MIME types', () => {
      expect(getFileIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').icon)
        .toBe(FileSpreadsheet)
      expect(getFileIcon('application/vnd.ms-excel').icon).toBe(FileSpreadsheet)
      expect(getFileIcon('text/csv').icon).toBe(FileSpreadsheet)
    })

    it('returns FileType2 for Word document MIME types', () => {
      expect(getFileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document').icon)
        .toBe(FileType2)
      expect(getFileIcon('application/msword').icon).toBe(FileType2)
      expect(getFileIcon('application/rtf').icon).toBe(FileType2)
    })

    it('returns FileText for presentation MIME types', () => {
      expect(getFileIcon('application/vnd.openxmlformats-officedocument.presentationml.presentation').icon)
        .toBe(FileText)
      expect(getFileIcon('application/vnd.ms-powerpoint').icon).toBe(FileText)
    })

    it('returns FileText for text MIME types', () => {
      expect(getFileIcon('text/plain').icon).toBe(FileText)
      expect(getFileIcon('text/html').icon).toBe(FileText)
    })
  })

  describe('file extension resolution (Priority 2)', () => {
    it('resolves common extensions when MIME is null', () => {
      expect(getFileIcon(null, null, 'pdf').icon).toBe(FileText)
      expect(getFileIcon(null, null, 'doc').icon).toBe(FileType2)
      expect(getFileIcon(null, null, 'docx').icon).toBe(FileType2)
      expect(getFileIcon(null, null, 'xls').icon).toBe(FileSpreadsheet)
      expect(getFileIcon(null, null, 'xlsx').icon).toBe(FileSpreadsheet)
      expect(getFileIcon(null, null, 'csv').icon).toBe(FileSpreadsheet)
      expect(getFileIcon(null, null, 'jpg').icon).toBe(ImageIcon)
      expect(getFileIcon(null, null, 'png').icon).toBe(ImageIcon)
      expect(getFileIcon(null, null, 'webp').icon).toBe(ImageIcon)
      expect(getFileIcon(null, null, 'heic').icon).toBe(ImageIcon)
    })

    it('handles extensions with leading dots', () => {
      expect(getFileIcon(null, null, '.pdf').icon).toBe(FileText)
      expect(getFileIcon(null, null, '.jpg').icon).toBe(ImageIcon)
    })

    it('handles uppercase extensions', () => {
      expect(getFileIcon(null, null, 'PDF').icon).toBe(FileText)
      expect(getFileIcon(null, null, 'JPG').icon).toBe(ImageIcon)
      expect(getFileIcon(null, null, 'XLSX').icon).toBe(FileSpreadsheet)
    })
  })

  describe('file category resolution (Priority 3)', () => {
    it('maps roofing categories to semantic icons', () => {
      expect(getFileIcon(null, 'contracts-agreements').icon).toBe(FileSignature)
      expect(getFileIcon(null, 'insurance-documents').icon).toBe(Shield)
      expect(getFileIcon(null, 'invoices-estimates').icon).toBe(Receipt)
      expect(getFileIcon(null, 'permits-inspections').icon).toBe(ClipboardCheck)
      expect(getFileIcon(null, 'warranty-documents').icon).toBe(Award)
      expect(getFileIcon(null, 'material-specs').icon).toBe(Layers)
    })

    it('returns default for non-mapped categories', () => {
      expect(getFileIcon(null, 'photos-before').icon).toBe(File)
      expect(getFileIcon(null, 'photos-damage').icon).toBe(File)
      expect(getFileIcon(null, 'other').icon).toBe(File)
    })
  })

  describe('resolution priority', () => {
    it('MIME type takes precedence over extension', () => {
      // PDF MIME with .jpg extension — MIME wins
      const result = getFileIcon('application/pdf', null, 'jpg')
      expect(result.icon).toBe(FileText)
      expect(result.label).toBe('PDF')
    })

    it('MIME type takes precedence over category', () => {
      const result = getFileIcon('image/jpeg', 'contracts-agreements')
      expect(result.icon).toBe(ImageIcon)
    })

    it('extension takes precedence over category', () => {
      const result = getFileIcon(null, 'insurance-documents', 'xlsx')
      expect(result.icon).toBe(FileSpreadsheet)
    })
  })

  describe('default fallback', () => {
    it('returns generic File icon when nothing matches', () => {
      const result = getFileIcon(null, null, null)
      expect(result.icon).toBe(File)
      expect(result.label).toBe('File')
    })

    it('returns generic File for unknown MIME types', () => {
      const result = getFileIcon('application/octet-stream')
      expect(result.icon).toBe(File)
    })

    it('returns generic File for unknown extensions', () => {
      const result = getFileIcon(null, null, 'xyz')
      expect(result.icon).toBe(File)
    })
  })

  describe('label accuracy', () => {
    it('returns descriptive labels', () => {
      expect(getFileIcon('image/jpeg').label).toBe('Image')
      expect(getFileIcon('application/pdf').label).toBe('PDF')
      expect(getFileIcon(null, null, 'xlsx').label).toBe('Excel')
      expect(getFileIcon(null, null, 'csv').label).toBe('CSV')
      expect(getFileIcon(null, null, 'docx').label).toBe('Word')
      expect(getFileIcon(null, 'insurance-documents').label).toBe('Insurance')
      expect(getFileIcon(null, 'invoices-estimates').label).toBe('Invoice')
      expect(getFileIcon(null, 'permits-inspections').label).toBe('Permit')
    })
  })
})
