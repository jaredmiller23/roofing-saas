'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eraser, Pen, Type, Upload, Check, X } from 'lucide-react'

interface SignatureCaptureProps {
  onSignatureCapture: (signatureData: string, method: 'draw' | 'type' | 'upload') => void
  onCancel?: () => void
}

export function SignatureCapture({ onSignatureCapture, onCancel }: SignatureCaptureProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [typedSignature, setTypedSignature] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 200 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const typeCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Responsive canvas sizing - optimized for mobile
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 32 // Account for padding
        const isMobile = window.innerWidth < 768
        const width = Math.min(containerWidth, isMobile ? containerWidth : 600)
        const height = Math.min(isMobile ? 160 : 200, width * (isMobile ? 0.4 : 0.33))
        setCanvasSize({ width, height })
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  // Initialize draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size based on container
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Set drawing styles - optimized for mobile touch
    const isMobile = window.innerWidth < 768
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = isMobile ? 4 : 3 // Thicker on mobile for better touch visibility
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.imageSmoothingEnabled = true
  }, [canvasSize])

  // Generate typed signature on canvas
  useEffect(() => {
    if (activeTab !== 'type' || !typedSignature) return

    const canvas = typeCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw typed signature with responsive font size
    const fontSize = Math.min(48, canvasSize.width * 0.08)
    ctx.font = `${fontSize}px "Dancing Script", cursive, serif`
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2)
  }, [typedSignature, activeTab, canvasSize])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling on touch
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault() // Prevent scrolling on touch

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
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
    <div ref={containerRef} className="w-full max-w-3xl mx-auto bg-card rounded-lg border border-border p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4">Sign Document</h2>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'type' | 'upload')}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger 
            value="draw" 
            className="flex items-center gap-1 md:gap-2 min-h-[44px] text-sm md:text-base"
          >
            <Pen className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Draw</span>
          </TabsTrigger>
          <TabsTrigger 
            value="type" 
            className="flex items-center gap-1 md:gap-2 min-h-[44px] text-sm md:text-base"
          >
            <Type className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Type</span>
          </TabsTrigger>
          <TabsTrigger 
            value="upload" 
            className="flex items-center gap-1 md:gap-2 min-h-[44px] text-sm md:text-base"
          >
            <Upload className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-3 md:space-y-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border-2 border-border rounded-lg w-full cursor-crosshair bg-card touch-none"
              style={{
                height: canvasSize.height,
                touchAction: 'none' // Prevent all touch gestures except drawing
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
            />
            <div className="absolute bottom-2 right-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="flex items-center gap-1 md:gap-2 min-h-[44px] min-w-[44px]"
              >
                <Eraser className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Draw your signature above using your finger or mouse
          </p>
        </TabsContent>

        <TabsContent value="type" className="space-y-3 md:space-y-4">
          <div>
            <Label htmlFor="typed-signature" className="text-sm">Type your full name</Label>
            <Input
              id="typed-signature"
              type="text"
              placeholder="John Doe"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              className="text-lg md:text-xl mt-2 min-h-[44px]"
            />
          </div>
          {typedSignature && (
            <div className="border-2 border-border rounded-lg bg-card p-2 md:p-4">
              <canvas 
                ref={typeCanvasRef} 
                className="w-full"
                style={{ height: canvasSize.height }}
              />
            </div>
          )}
          <p className="text-xs md:text-sm text-muted-foreground">
            Your typed signature will be converted to a handwriting style
          </p>
        </TabsContent>

        <TabsContent value="upload" className="space-y-3 md:space-y-4">
          <div>
            <Label htmlFor="signature-upload" className="text-sm">Upload signature image</Label>
            <Input
              id="signature-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-2 min-h-[44px] file:min-h-[36px] file:mr-3"
            />
          </div>
          {uploadedImage && (
            <div className="border-2 border-border rounded-lg bg-card p-2 md:p-4 h-40 md:h-56 relative">
              <Image
                src={uploadedImage}
                alt="Uploaded signature"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          <p className="text-xs md:text-sm text-muted-foreground">
            Upload a clear image of your signature (PNG, JPG, or GIF)
          </p>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 min-h-[48px] md:min-h-[44px] text-base"
          >
            <X className="h-4 w-4 mr-2 md:hidden" />
            <span>Cancel</span>
          </Button>
        )}
        <Button
          type="button"
          onClick={captureSignature}
          className="flex-1 bg-primary hover:bg-primary/90 min-h-[48px] md:min-h-[44px] text-base"
          disabled={
            (activeTab === 'draw' && !canvasRef.current) ||
            (activeTab === 'type' && !typedSignature) ||
            (activeTab === 'upload' && !uploadedImage)
          }
        >
          <Check className="h-4 w-4 mr-2" />
          <span>Confirm</span>
        </Button>
      </div>
    </div>
  )
}
