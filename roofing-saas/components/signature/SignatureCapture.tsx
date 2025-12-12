'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eraser, Pen, Type, Upload, Check } from 'lucide-react'

interface SignatureCaptureProps {
  onSignatureCapture: (signatureData: string, method: 'draw' | 'type' | 'upload') => void
  onCancel?: () => void
}

export function SignatureCapture({ onSignatureCapture, onCancel }: SignatureCaptureProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [typedSignature, setTypedSignature] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const typeCanvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 600
    canvas.height = 200

    // Set drawing styles
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // Generate typed signature on canvas
  useEffect(() => {
    if (activeTab !== 'type' || !typedSignature) return

    const canvas = typeCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 600
    canvas.height = 200

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw typed signature
    ctx.font = '48px "Dancing Script", cursive, serif'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2)
  }, [typedSignature, activeTab])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const captureSignature = () => {
    let signatureData: string = ''
    const method: 'draw' | 'type' | 'upload' = activeTab

    if (activeTab === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return
      signatureData = canvas.toDataURL('image/png')
    } else if (activeTab === 'type') {
      const canvas = typeCanvasRef.current
      if (!canvas || !typedSignature) return
      signatureData = canvas.toDataURL('image/png')
    } else if (activeTab === 'upload') {
      if (!uploadedImage) return
      signatureData = uploadedImage
    }

    if (signatureData) {
      onSignatureCapture(signatureData, method)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-card rounded-lg border border p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Sign Document</h2>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'type' | 'upload')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="draw" className="flex items-center gap-2">
            <Pen className="h-4 w-4" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Type
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border-2 border-gray-300 rounded-lg w-full cursor-crosshair bg-card"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="absolute bottom-2 right-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="flex items-center gap-2"
              >
                <Eraser className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Draw your signature above using your mouse or touchscreen
          </p>
        </TabsContent>

        <TabsContent value="type" className="space-y-4">
          <div>
            <Label htmlFor="typed-signature">Type your full name</Label>
            <Input
              id="typed-signature"
              type="text"
              placeholder="John Doe"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              className="text-xl mt-2"
            />
          </div>
          {typedSignature && (
            <div className="border-2 border-gray-300 rounded-lg bg-card p-4">
              <canvas ref={typeCanvasRef} className="w-full" />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Your typed signature will be converted to a handwriting style
          </p>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div>
            <Label htmlFor="signature-upload">Upload signature image</Label>
            <Input
              id="signature-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-2"
            />
          </div>
          {uploadedImage && (
            <div className="border-2 border-gray-300 rounded-lg bg-card p-4 h-56 relative">
              <Image
                src={uploadedImage}
                alt="Uploaded signature"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Upload a clear image of your signature (PNG, JPG, or GIF)
          </p>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 mt-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={captureSignature}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={
            (activeTab === 'draw' && !canvasRef.current) ||
            (activeTab === 'type' && !typedSignature) ||
            (activeTab === 'upload' && !uploadedImage)
          }
        >
          <Check className="h-4 w-4 mr-2" />
          Confirm Signature
        </Button>
      </div>
    </div>
  )
}
