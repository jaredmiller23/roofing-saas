'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SignatureCapture } from '@/components/signature/SignatureCapture'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

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
  project?: { name: string }
  signatures?: Array<{ signer_type: string }>
}

export default function SignDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [document, setDocument] = useState<SignatureDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showSignature, setShowSignature] = useState(false)

  // Signer information
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerType, setSignerType] = useState<'customer' | 'company'>('customer')

  useEffect(() => {
    loadDocument()
  }, [documentId])

  const loadDocument = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/signature-documents/${documentId}/sign`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load document')
      }

      setDocument(data.document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignatureCapture = async (signatureData: string, method: 'draw' | 'type' | 'upload') => {
    if (!signerName || !signerEmail) {
      setError('Please provide your name and email')
      return
    }

    try {
      setIsSigning(true)
      setError(null)

      const res = await fetch(`/api/signature-documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName,
          signer_email: signerEmail,
          signer_type: signerType,
          signature_data: signatureData,
          signature_method: method
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit signature')
      }

      setSuccess(true)
      setShowSignature(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit signature')
    } finally {
      setIsSigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert className="max-w-md bg-red-50 border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Document Signed Successfully!
          </h1>
          <p className="text-gray-600 mb-6">
            Your signature has been recorded. You will receive a confirmation email shortly.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="w-full"
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
        color: 'yellow',
        title: 'Document Expired',
        message: 'This document has expired and can no longer be signed.'
      },
      signed: {
        icon: CheckCircle,
        color: 'green',
        title: 'Already Signed',
        message: 'This document has already been signed by all required parties.'
      },
      declined: {
        icon: XCircle,
        color: 'red',
        title: 'Document Declined',
        message: 'This document has been declined.'
      }
    }

    const status = isExpired ? 'expired' : isSigned ? 'signed' : 'declined'
    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className={`max-w-md w-full bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-8 text-center`}>
          <Icon className={`h-12 w-12 text-${config.color}-600 mx-auto mb-4`} />
          <h1 className={`text-2xl font-bold text-${config.color}-900 mb-2`}>
            {config.title}
          </h1>
          <p className={`text-${config.color}-700`}>
            {config.message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {document.title}
              </h1>
              {document.description && (
                <p className="text-gray-600 mb-4">{document.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Document Type:</span>
                  <span className="ml-2 font-medium text-gray-900 capitalize">
                    {document.document_type.replace('_', ' ')}
                  </span>
                </div>
                {document.project && (
                  <div>
                    <span className="text-gray-600">Project:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {document.project.name}
                    </span>
                  </div>
                )}
                {document.expires_at && (
                  <div>
                    <span className="text-gray-600">Expires:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {new Date(document.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Document Preview */}
        {document.file_url && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <embed
                src={document.file_url}
                type="application/pdf"
                className="w-full h-96"
              />
            </div>
          </div>
        )}

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Signer Information */}
        {!showSignature && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="signer-name">Full Name *</Label>
                <Input
                  id="signer-name"
                  type="text"
                  placeholder="John Doe"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signer-email">Email Address *</Label>
                <Input
                  id="signer-email"
                  type="email"
                  placeholder="john@example.com"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signer-type">Signing As *</Label>
                <select
                  id="signer-type"
                  value={signerType}
                  onChange={(e) => setSignerType(e.target.value as 'customer' | 'company')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="customer">Customer</option>
                  <option value="company">Company Representative</option>
                </select>
              </div>
            </div>

            <Button
              onClick={() => setShowSignature(true)}
              disabled={!signerName || !signerEmail}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
            >
              Proceed to Sign
            </Button>
          </div>
        )}

        {/* Signature Capture */}
        {showSignature && (
          <SignatureCapture
            onSignatureCapture={handleSignatureCapture}
            onCancel={() => setShowSignature(false)}
          />
        )}
      </div>
    </div>
  )
}
