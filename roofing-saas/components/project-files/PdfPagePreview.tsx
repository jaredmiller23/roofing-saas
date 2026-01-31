'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker (same pattern as DocumentEditor.tsx)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfPagePreviewProps {
  fileUrl: string
  width: number
  onLoadSuccess?: () => void
  onLoadError?: () => void
}

export function PdfPagePreview({ fileUrl, width, onLoadSuccess, onLoadError }: PdfPagePreviewProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className="overflow-hidden"
      style={{
        width,
        height: width,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 150ms ease-in',
      }}
    >
      <Document
        file={fileUrl}
        onLoadSuccess={() => {
          setLoaded(true)
          onLoadSuccess?.()
        }}
        onLoadError={() => onLoadError?.()}
        loading={null}
      >
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  )
}
