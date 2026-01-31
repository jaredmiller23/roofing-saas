'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { SignatureCapture } from '@/components/signatures/SignatureCapture'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  PenLine,
  Calendar,
  Type,
  CheckSquare,
  User,
  Mail,
  Hash,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Ban,
  WifiOff,
  CloudOff
} from 'lucide-react'

// Offline support
import { cacheSignatureDocument, getCachedSignatureDocument } from '@/lib/offline/signature-cache'
import { queueOfflineSignature } from '@/lib/offline/signature-queue'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Field type configuration (matching FieldPalette)
type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox' | 'name' | 'email'

interface SignatureFieldPlacement {
  id: string
  type: FieldType
  label: string
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  assignedTo: 'customer' | 'company' | 'any'
}

interface SignatureDocument {
  id: string
  title: string
  description: string
  document_type: string
  file_url: string | null
  status: string
  expires_at: string | null
  requires_customer_signature: boolean
  requires_company_signature: boolean
  signature_fields?: SignatureFieldPlacement[]
  project_id?: string | null
  project?: { name: string }
  signatures?: Array<{ signer_type: string }>
}

// Map field types to icons
const fieldIcons: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  signature: PenLine,
  initials: Hash,
  date: Calendar,
  name: User,
  email: Mail,
  text: Type,
  checkbox: CheckSquare,
}

// Custom hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

interface FieldOverlayProps {
  field: SignatureFieldPlacement
  isActive: boolean
  isCompleted: boolean
  onClick: () => void
  fieldRef: React.RefObject<HTMLDivElement | null>
  tabIndex: number
  scale: number
}

function FieldOverlay({ field, isActive, isCompleted, onClick, fieldRef, tabIndex, scale }: FieldOverlayProps) {
  const Icon = fieldIcons[field.type]

  // Ensure minimum touch target size of 44px at current scale
  const minTouchSize = 44
  const scaledWidth = field.width * scale
  const scaledHeight = field.height * scale
  const touchWidth = Math.max(scaledWidth, minTouchSize / scale)
  const touchHeight = Math.max(scaledHeight, minTouchSize / scale)

  return (
    <div
      ref={fieldRef}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`absolute cursor-pointer transition-all duration-200 rounded border-2
        ${isCompleted
          ? 'bg-green-500/20 border-green-500'
          : isActive
            ? 'bg-primary/20 border-primary animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background'
            : 'bg-primary/10 border-primary/50 hover:bg-primary/20 hover:border-primary active:bg-primary/30'
        }
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        touch-manipulation`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${touchWidth}px`,
        height: `${touchHeight}px`,
        minWidth: `${minTouchSize / scale}px`,
        minHeight: `${minTouchSize / scale}px`,
      }}
      role="button"
      aria-label={`${field.label} field${field.required ? ' (required)' : ''}${isCompleted ? ' - completed' : ''}`}
    >
      <div className="flex items-center justify-center h-full gap-1 px-1">
        {isCompleted ? (
          <CheckCircle className="h-5 w-5 md:h-4 md:w-4 text-green-600" />
        ) : (
          <>
            {Icon && <Icon className="h-4 w-4 md:h-3 md:w-3 text-primary shrink-0" />}
            <span className="text-xs text-foreground truncate hidden sm:inline">{field.label}</span>
            {field.required && <span className="text-red-500 text-xs shrink-0">*</span>}
          </>
        )}
      </div>
    </div>
  )
}

export default function SignDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = params.id as string
  const isMobile = useIsMobile()

  // Get initial signer type from query param (?as=company)
  const asParam = searchParams.get('as')
  const initialSignerType = asParam === 'company' ? 'company' : 'customer'

  // Check if this is an in-person signing session
  const isInPerson = searchParams.get('inperson') === 'true'

  const [document, setDocument] = useState<SignatureDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // PDF state
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfScale, setPdfScale] = useState(1)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  // Signer information
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerType, setSignerType] = useState<'customer' | 'company'>(initialSignerType)

  // Field completion state
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set())
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [showFieldCapture, setShowFieldCapture] = useState(false)
  const [currentFieldForCapture, setCurrentFieldForCapture] = useState<SignatureFieldPlacement | null>(null)

  // Decline workflow state
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false)
  const [declined, setDeclined] = useState(false)

  // Offline state
  const [isOnline, setIsOnline] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [offlineSubmitMessage, setOfflineSubmitMessage] = useState<string | null>(null)

  // Field refs for scrolling
  const fieldRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map())

  // Zoom controls for mobile
  const handleZoomIn = () => setPdfScale(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setPdfScale(prev => Math.max(prev - 0.25, 0.5))

  // Network detection for offline support
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    // Set initial state
    updateOnlineStatus()

    // Listen for network changes
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const loadDocument = useCallback(async () => {
    try {
      setIsLoading(true)
      setIsOfflineMode(false)

      // If offline, try to load from cache first
      if (!navigator.onLine) {
        const cached = await getCachedSignatureDocument(documentId)
        if (cached) {
          setDocument(cached.document_data as SignatureDocument)
          setIsOfflineMode(true)

          // Initialize field refs
          if (cached.document_data.signature_fields) {
            cached.document_data.signature_fields.forEach((field: SignatureFieldPlacement) => {
              if (!fieldRefs.current.has(field.id)) {
                fieldRefs.current.set(field.id, { current: null })
              }
            })
          }
          return
        }
        // No cache available offline
        setError('This document is not available offline. Please connect to the internet.')
        return
      }

      // Online - fetch from API
      const res = await fetch(`/api/signature-documents/${documentId}/sign`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to load document')
      }

      // API returns { success, data: { document } }
      const doc = data.data?.document
      if (!doc) {
        throw new Error('Document not found')
      }

      setDocument(doc)

      // Pre-fill signer info for in-person signing from linked contact
      if (isInPerson && doc.contact) {
        const contact = doc.contact
        if (contact.first_name || contact.last_name) {
          setSignerName(`${contact.first_name || ''} ${contact.last_name || ''}`.trim())
        }
        if (contact.email) {
          setSignerEmail(contact.email)
        }
      }

      // Initialize field refs
      if (doc.signature_fields) {
        doc.signature_fields.forEach((field: SignatureFieldPlacement) => {
          if (!fieldRefs.current.has(field.id)) {
            fieldRefs.current.set(field.id, { current: null })
          }
        })
      }

      // Cache the document for future offline access (fire and forget)
      cacheSignatureDocument(documentId).catch((err) => {
        console.warn('[Offline] Failed to cache document:', err)
      })
    } catch (err) {
      // If fetch failed and we're now offline, try cache
      if (!navigator.onLine) {
        const cached = await getCachedSignatureDocument(documentId)
        if (cached) {
          setDocument(cached.document_data as SignatureDocument)
          setIsOfflineMode(true)

          if (cached.document_data.signature_fields) {
            cached.document_data.signature_fields.forEach((field: SignatureFieldPlacement) => {
              if (!fieldRefs.current.has(field.id)) {
                fieldRefs.current.set(field.id, { current: null })
              }
            })
          }
          return
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }, [documentId, isInPerson])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  // Get fields for the current signer type
  const getSignerFields = useCallback(() => {
    if (!document?.signature_fields) return []
    return document.signature_fields.filter(
      (f) => f.assignedTo === signerType || f.assignedTo === 'any'
    )
  }, [document, signerType])

  // Get fields for current page
  const getPageFields = useCallback(() => {
    return getSignerFields().filter((f) => f.page === currentPage)
  }, [getSignerFields, currentPage])

  // Calculate progress
  const signerFields = getSignerFields()
  const requiredFields = signerFields.filter((f) => f.required)
  const completedRequiredFields = requiredFields.filter((f) => completedFields.has(f.id))
  const progressPercent = requiredFields.length > 0
    ? (completedRequiredFields.length / requiredFields.length) * 100
    : 100

  // Auto-set active field to first incomplete required field
  useEffect(() => {
    if (!activeFieldId && signerFields.length > 0) {
      const firstIncomplete = signerFields.find((f) => f.required && !completedFields.has(f.id))
      if (firstIncomplete) {
        setActiveFieldId(firstIncomplete.id)
        setCurrentPage(firstIncomplete.page)
      }
    }
  }, [signerFields, completedFields, activeFieldId])

  // Scroll to active field
  useEffect(() => {
    if (activeFieldId) {
      const ref = fieldRefs.current.get(activeFieldId)
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ref.current.focus()
      }
    }
  }, [activeFieldId, currentPage])

  const handleFieldClick = (field: SignatureFieldPlacement) => {
    setActiveFieldId(field.id)

    // For signature/initials fields, open capture modal/sheet
    if (field.type === 'signature' || field.type === 'initials') {
      setCurrentFieldForCapture(field)
      setShowFieldCapture(true)
    } else if (field.type === 'date') {
      // Auto-fill date
      setCompletedFields((prev) => new Set(prev).add(field.id))
      moveToNextField(field.id)
    } else if (field.type === 'name') {
      // Auto-fill name if provided
      if (signerName) {
        setCompletedFields((prev) => new Set(prev).add(field.id))
        moveToNextField(field.id)
      }
    } else if (field.type === 'email') {
      // Auto-fill email if provided
      if (signerEmail) {
        setCompletedFields((prev) => new Set(prev).add(field.id))
        moveToNextField(field.id)
      }
    } else if (field.type === 'checkbox') {
      // Toggle checkbox
      setCompletedFields((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(field.id)) {
          newSet.delete(field.id)
        } else {
          newSet.add(field.id)
        }
        return newSet
      })
    } else {
      // Text field - mark as completed on click (simplified)
      setCompletedFields((prev) => new Set(prev).add(field.id))
      moveToNextField(field.id)
    }
  }

  const moveToNextField = (currentFieldId: string) => {
    const currentIndex = signerFields.findIndex((f) => f.id === currentFieldId)
    const nextField = signerFields.slice(currentIndex + 1).find((f) => f.required && !completedFields.has(f.id))

    if (nextField) {
      setActiveFieldId(nextField.id)
      setCurrentPage(nextField.page)
    } else {
      setActiveFieldId(null)
    }
  }

  const handleFieldSignatureCapture = async (_signatureData: string, _method: 'draw' | 'type' | 'upload') => {
    if (!currentFieldForCapture) return

    // Mark field as completed
    setCompletedFields((prev) => new Set(prev).add(currentFieldForCapture.id))
    setShowFieldCapture(false)
    setCurrentFieldForCapture(null)

    // Move to next field
    moveToNextField(currentFieldForCapture.id)
  }

  const handleFinalSubmit = async () => {
    if (!signerName || !signerEmail) {
      setError('Please provide your name and email')
      return
    }

    // Check all required fields are completed
    const incompleteRequired = requiredFields.filter((f) => !completedFields.has(f.id))
    if (incompleteRequired.length > 0) {
      setError(`Please complete all required fields. ${incompleteRequired.length} field(s) remaining.`)
      setActiveFieldId(incompleteRequired[0].id)
      setCurrentPage(incompleteRequired[0].page)
      return
    }

    try {
      setError(null)

      // If offline, queue the signature for later sync
      if (isOfflineMode || !isOnline) {
        await queueOfflineSignature({
          document_id: documentId,
          signer_name: signerName,
          signer_email: signerEmail,
          signer_type: signerType,
          signature_data: 'field-based-signature',
          signature_method: 'draw',
          completed_fields: Array.from(completedFields),
          captured_at: Date.now(),
        })

        setOfflineSubmitMessage('Your signature has been captured and will be submitted automatically when you reconnect to the internet.')
        setSuccess(true)
        return
      }

      // Online - submit directly
      const res = await fetch(`/api/signature-documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName,
          signer_email: signerEmail,
          signer_type: signerType,
          signature_data: 'field-based-signature',
          signature_method: 'draw',
          completed_fields: Array.from(completedFields)
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit signature')
      }

      setSuccess(true)
    } catch (err) {
      // If submission failed due to network, queue offline
      if (!navigator.onLine) {
        try {
          await queueOfflineSignature({
            document_id: documentId,
            signer_name: signerName,
            signer_email: signerEmail,
            signer_type: signerType,
            signature_data: 'field-based-signature',
            signature_method: 'draw',
            completed_fields: Array.from(completedFields),
            captured_at: Date.now(),
          })

          setOfflineSubmitMessage('Connection lost. Your signature has been saved and will be submitted when you reconnect.')
          setSuccess(true)
          return
        } catch (_queueErr) {
          setError('Failed to save signature offline. Please try again.')
          return
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to submit signature')
    }
  }

  // Handle document decline
  const handleDeclineClick = () => {
    setShowDeclineDialog(true)
  }

  const handleDeclineConfirm = async () => {
    if (!declineReason.trim()) {
      setError('Please provide a reason for declining')
      return
    }

    try {
      setIsSubmittingDecline(true)
      setError(null)

      const res = await fetch(`/api/signature-documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          decline_reason: declineReason.trim(),
          signer_name: signerName || 'Anonymous',
          signer_email: signerEmail || 'not-provided@example.com'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to decline document')
      }

      setShowDeclineDialog(false)
      setDeclined(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline document')
    } finally {
      setIsSubmittingDecline(false)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfLoading(false)
  }

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && signerFields.length > 0) {
      const currentIndex = activeFieldId
        ? signerFields.findIndex((f) => f.id === activeFieldId)
        : -1
      const nextIndex = (currentIndex + 1) % signerFields.length
      const nextField = signerFields[nextIndex]
      if (nextField) {
        e.preventDefault()
        setActiveFieldId(nextField.id)
        setCurrentPage(nextField.page)
      }
    } else if (e.key === 'Tab' && e.shiftKey && signerFields.length > 0) {
      const currentIndex = activeFieldId
        ? signerFields.findIndex((f) => f.id === activeFieldId)
        : 0
      const prevIndex = (currentIndex - 1 + signerFields.length) % signerFields.length
      const prevField = signerFields[prevIndex]
      if (prevField) {
        e.preventDefault()
        setActiveFieldId(prevField.id)
        setCurrentPage(prevField.page)
      }
    }
  }, [activeFieldId, signerFields])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert className="max-w-md bg-red-50 border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (success) {
    // Offline success screen
    if (offlineSubmitMessage) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 md:p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <CloudOff className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Signature Captured
            </h1>
            <p className="text-muted-foreground mb-6">
              {offlineSubmitMessage}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <WifiOff className="h-4 w-4 shrink-0" />
                <span>Your signature is saved locally and will sync automatically.</span>
              </div>
            </div>
            <Button
              onClick={() => router.push('/')}
              className="w-full min-h-[44px]"
            >
              Done
            </Button>
          </div>
        </div>
      )
    }

    // Online success screen
    // Determine redirect based on context
    const getRedirectPath = () => {
      // If company rep signed and document has a project, redirect to project signatures
      if (signerType === 'company' && document?.project_id) {
        return `/projects/${document.project_id}#signatures`
      }
      // If company rep signed without project, go to signatures list
      if (signerType === 'company') {
        return '/signatures'
      }
      // For customers, just go home (they likely don't have CRM access)
      return '/'
    }

    const redirectPath = getRedirectPath()
    const isCompanyRep = signerType === 'company'

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 md:p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Document Signed Successfully!
          </h1>
          <p className="text-muted-foreground mb-6">
            {isCompanyRep
              ? 'Your signature has been recorded. The document is now complete.'
              : 'Your signature has been recorded. You will receive a confirmation email shortly.'}
          </p>
          <Button
            onClick={() => router.push(redirectPath)}
            className="w-full min-h-[44px]"
          >
            {isCompanyRep && document?.project_id
              ? 'Back to Project'
              : isCompanyRep
                ? 'View Signatures'
                : 'Done'}
          </Button>
        </div>
      </div>
    )
  }

  // Show declined success screen
  if (declined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 md:p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Document Declined
          </h1>
          <p className="text-muted-foreground mb-6">
            You have declined to sign this document. The document owner has been notified of your decision.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="w-full min-h-[44px]"
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  if (!document) {
    return null
  }

  // Check document status
  const isExpired = document.status === 'expired' ||
                    (document.expires_at && new Date(document.expires_at) < new Date())
  const isSigned = document.status === 'signed'
  const isDeclined = document.status === 'declined'

  if (isExpired || isSigned || isDeclined) {
    const statusConfig = {
      expired: {
        icon: Clock,
        title: 'Document Expired',
        message: 'This document has expired and can no longer be signed.'
      },
      signed: {
        icon: CheckCircle,
        title: 'Already Signed',
        message: 'This document has already been signed by all required parties.'
      },
      declined: {
        icon: XCircle,
        title: 'Document Declined',
        message: 'This document has been declined.'
      }
    }

    const status = isExpired ? 'expired' : isSigned ? 'signed' : 'declined'
    const config = statusConfig[status]
    const StatusIcon = config.icon

    const containerStyles: Record<string, string> = {
      expired: 'bg-yellow-100 border-yellow-300',
      signed: 'bg-green-100 border-green-300',
      declined: 'bg-red-100 border-red-300'
    }
    const iconStyles: Record<string, string> = {
      expired: 'text-yellow-600',
      signed: 'text-green-600',
      declined: 'text-red-600'
    }
    const titleStyles: Record<string, string> = {
      expired: 'text-yellow-900',
      signed: 'text-green-900',
      declined: 'text-red-900'
    }
    const textStyles: Record<string, string> = {
      expired: 'text-yellow-700',
      signed: 'text-green-700',
      declined: 'text-red-700'
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className={`max-w-md w-full ${containerStyles[status]} border rounded-lg p-6 md:p-8 text-center`}>
          <StatusIcon className={`h-12 w-12 ${iconStyles[status]} mx-auto mb-4`} />
          <h1 className={`text-xl md:text-2xl font-bold ${titleStyles[status]} mb-2`}>
            {config.title}
          </h1>
          <p className={textStyles[status]}>
            {config.message}
          </p>
        </div>
      </div>
    )
  }

  const hasFields = document.signature_fields && document.signature_fields.length > 0
  const pageFields = getPageFields()

  // Signature capture component - either Sheet (mobile) or Modal (desktop)
  const signatureCaptureContent = currentFieldForCapture && (
    <SignatureCapture
      onSignatureCapture={handleFieldSignatureCapture}
      onCancel={() => {
        setShowFieldCapture(false)
        setCurrentFieldForCapture(null)
      }}
    />
  )

  return (
    <div className="min-h-screen bg-background py-4 md:py-8 px-2 md:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Offline Mode Indicator */}
        {isOfflineMode && (
          <Alert className="mb-4 md:mb-6 bg-yellow-50 border-yellow-200">
            <WifiOff className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Offline Mode:</strong> You&apos;re viewing a cached version of this document.
              Your signature will be saved locally and submitted when you reconnect.
            </AlertDescription>
          </Alert>
        )}

        {/* Header - Simplified on mobile */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-primary/10 rounded-lg shrink-0">
              <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-foreground mb-1 md:mb-2 truncate">
                {document.title}
              </h1>
              {document.description && (
                <p className="text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2">{document.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium text-foreground capitalize">
                    {document.document_type.replace('_', ' ')}
                  </span>
                </div>
                {document.project && (
                  <div className="hidden md:block">
                    <span className="text-muted-foreground">Project:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {document.project.name}
                    </span>
                  </div>
                )}
                {document.expires_at && (
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {new Date(document.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Signer Information - Single column on mobile */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <Label htmlFor="signer-name" className="text-sm">Full Name *</Label>
              <Input
                id="signer-name"
                type="text"
                placeholder="John Doe"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
                className="min-h-[44px] text-base"
              />
            </div>
            <div>
              <Label htmlFor="signer-email" className="text-sm">Email Address *</Label>
              <Input
                id="signer-email"
                type="email"
                placeholder="john@example.com"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                required
                className="min-h-[44px] text-base"
              />
            </div>
            <div>
              <Label htmlFor="signer-type" className="text-sm">Signing As *</Label>
              <select
                id="signer-type"
                value={signerType}
                onChange={(e) => setSignerType(e.target.value as 'customer' | 'company')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] text-base"
              >
                <option value="customer">Customer</option>
                <option value="company">Company Representative</option>
              </select>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        {hasFields && requiredFields.length > 0 && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Progress
              </span>
              <span className="text-xs md:text-sm text-muted-foreground">
                {completedRequiredFields.length}/{requiredFields.length} fields
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {error && (
          <Alert className="mb-4 md:mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Document Preview with Field Overlays */}
        {document.file_url && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-3 md:p-6 mb-4 md:mb-6">
            {/* Header with navigation and zoom controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 md:mb-4">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                {hasFields ? 'Tap fields to sign' : 'Document Preview'}
              </h2>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                {/* Zoom controls - more prominent on mobile */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={pdfScale <= 0.5}
                    className="min-h-[44px] min-w-[44px] p-0"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {Math.round(pdfScale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={pdfScale >= 3}
                    className="min-h-[44px] min-w-[44px] p-0"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </Button>
                </div>
                {/* Page navigation */}
                {numPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="min-h-[44px] min-w-[44px] p-0"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-1">
                      {currentPage}/{numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                      disabled={currentPage >= numPages}
                      className="min-h-[44px] min-w-[44px] p-0"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* PDF Container - Full width on mobile with touch-action for pinch-zoom */}
            <div
              ref={pdfContainerRef}
              className="relative border border-border rounded-lg overflow-auto bg-muted"
              style={{
                maxHeight: isMobile ? '60vh' : '600px',
                WebkitOverflowScrolling: 'touch',
                touchAction: isMobile ? 'pinch-zoom pan-x pan-y' : 'auto'
              }}
            >
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-30">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              <div
                className="relative inline-block"
                style={{
                  transform: `scale(${pdfScale})`,
                  transformOrigin: 'top left',
                  minWidth: isMobile ? '100%' : 'auto'
                }}
              >
                <Document
                  file={document.file_url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={isMobile ? Math.max(window.innerWidth - 40, 320) : undefined}
                  />
                </Document>

                {/* Field Overlays */}
                {pageFields.map((field, index) => {
                  let ref = fieldRefs.current.get(field.id)
                  if (!ref) {
                    ref = { current: null }
                    fieldRefs.current.set(field.id, ref)
                  }

                  return (
                    <FieldOverlay
                      key={field.id}
                      field={field}
                      isActive={field.id === activeFieldId}
                      isCompleted={completedFields.has(field.id)}
                      onClick={() => handleFieldClick(field)}
                      fieldRef={ref}
                      tabIndex={index + 1}
                      scale={pdfScale}
                    />
                  )
                })}
              </div>
            </div>

            {/* Field Legend - Simplified on mobile */}
            {hasFields && (
              <div className="mt-3 md:mt-4 flex flex-wrap gap-3 md:gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded border-2 border-primary/50 bg-primary/10"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded border-2 border-primary bg-primary/20 animate-pulse"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-500/20"></div>
                  <span>Done</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-red-500">*</span>
                  <span>Required</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No PDF - Fields Only View */}
        {!document.file_url && hasFields && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Required Fields</h2>
            <div className="space-y-2 md:space-y-3">
              {signerFields.map((field) => {
                const FieldIcon = fieldIcons[field.type]
                const fieldIsCompleted = completedFields.has(field.id)
                const fieldIsActive = field.id === activeFieldId

                return (
                  <button
                    key={field.id}
                    onClick={() => handleFieldClick(field)}
                    className={`w-full flex items-center gap-3 p-3 md:p-4 rounded-lg border-2 transition-all min-h-[56px]
                      ${fieldIsCompleted
                        ? 'bg-green-500/10 border-green-500'
                        : fieldIsActive
                          ? 'bg-primary/10 border-primary animate-pulse'
                          : 'bg-muted/30 border-border hover:border-primary/50 active:bg-muted/50'
                      }`}
                  >
                    {fieldIsCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                    ) : (
                      <FieldIcon className="h-6 w-6 text-primary shrink-0" />
                    )}
                    <span className="flex-1 text-left text-foreground text-sm md:text-base">{field.label}</span>
                    {field.required && !fieldIsCompleted && (
                      <span className="text-red-500 text-xs md:text-sm shrink-0">Required</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Buttons - Sticky on mobile */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 md:p-6 sticky bottom-0 md:static">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleDeclineClick}
              className="sm:w-auto text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 min-h-[48px] md:min-h-[44px]"
            >
              <Ban className="h-4 w-4 mr-2" />
              Decline to Sign
            </Button>
            <Button
              onClick={handleFinalSubmit}
              disabled={!signerName || !signerEmail || (hasFields && completedRequiredFields.length < requiredFields.length)}
              className="flex-1 bg-primary hover:bg-primary/90 min-h-[48px] md:min-h-[44px] text-base"
              size="lg"
            >
              {hasFields
                ? `Sign Document (${completedRequiredFields.length}/${requiredFields.length})`
                : 'Sign Document'
              }
            </Button>
          </div>
          {hasFields && completedRequiredFields.length < requiredFields.length && (
            <p className="text-xs md:text-sm text-muted-foreground text-center mt-2">
              Complete all required fields to sign
            </p>
          )}
        </div>
      </div>

      {/* Decline Confirmation Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Decline Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this document? The document owner will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="decline-reason" className="text-sm font-medium">
              Reason for declining *
            </Label>
            <Textarea
              id="decline-reason"
              placeholder="Please explain why you are declining this document..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="mt-2 min-h-[100px]"
              required
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeclineDialog(false)}
              disabled={isSubmittingDecline}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              disabled={!declineReason.trim() || isSubmittingDecline}
            >
              {isSubmittingDecline ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Capture - Bottom Sheet on mobile, Modal on desktop */}
      {isMobile ? (
        <Sheet open={showFieldCapture} onOpenChange={setShowFieldCapture}>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>
                {currentFieldForCapture?.type === 'signature' ? 'Add Your Signature' : 'Add Your Initials'}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 pb-safe">
              {signatureCaptureContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        showFieldCapture && currentFieldForCapture && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  {currentFieldForCapture.type === 'signature' ? 'Add Your Signature' : 'Add Your Initials'}
                </h3>
              </div>
              <div className="p-4">
                {signatureCaptureContent}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
