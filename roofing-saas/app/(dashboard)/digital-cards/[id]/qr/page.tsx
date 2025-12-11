'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Copy, Check } from 'lucide-react'
import type { DigitalBusinessCard } from '@/lib/digital-cards/types'
import QRCode from 'qrcode'

export default function CardQRCodePage() {
  const params = useParams()
  const router = useRouter()
  const cardId = params.id as string

  const [card, setCard] = useState<DigitalBusinessCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchCard()
  }, [cardId])

  useEffect(() => {
    if (card) {
      generateQRCode()
    }
  }, [card])

  const fetchCard = async () => {
    try {
      const res = await fetch(`/api/digital-cards/${cardId}`)
      if (res.ok) {
        const data = await res.json()
        setCard(data.card)
      }
    } catch (error) {
      console.error('Error fetching card:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    if (!card) return

    const url = `${window.location.origin}/card/${card.slug}`

    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: card.brand_color,
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      })
      setQrDataUrl(dataUrl)

      // Also draw to canvas for download
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 400,
          margin: 2,
          color: {
            dark: card.brand_color,
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H',
        })
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const handleDownloadQR = () => {
    if (!canvasRef.current || !card) return

    canvasRef.current.toBlob((blob) => {
      if (!blob) return

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${card.slug}-qr-code.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
  }

  const handleCopyUrl = () => {
    if (!card) return

    const url = `${window.location.origin}/card/${card.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Card not found</p>
            <Button onClick={() => router.push('/digital-cards')}>
              Back to Cards
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cardUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/card/${card.slug}`

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/digital-cards')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cards
        </Button>
        <div>
          <h1 className="text-3xl font-bold">QR Code</h1>
          <p className="text-gray-600 mt-1">{card.full_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>
              Scan this code to view the digital business card
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            {qrDataUrl && (
              <div className="p-8 bg-white rounded-lg border-2 border-gray-200">
                <img src={qrDataUrl} alt="QR Code" className="w-full h-full" />
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 w-full">
              <Button onClick={handleDownloadQR} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card URL */}
        <Card>
          <CardHeader>
            <CardTitle>Card URL</CardTitle>
            <CardDescription>
              Share this link directly or via QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-background rounded-lg">
              <code className="text-sm break-all">{cardUrl}</code>
            </div>

            <Button onClick={handleCopyUrl} variant="outline" className="w-full">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </>
              )}
            </Button>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">How to Use</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lg">1.</span>
                  <span>Download the QR code image</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lg">2.</span>
                  <span>Print it on business cards, flyers, or displays</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lg">3.</span>
                  <span>When scanned, it opens your digital business card</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lg">4.</span>
                  <span>Visitors can save your contact info with one tap</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">Preview</h3>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(cardUrl, '_blank')}
              >
                Open Card in New Tab
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
