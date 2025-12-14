'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { logger } from '@/lib/logger'

interface MessageInputProps {
  contactId: string
  contactPhone: string
  onSent?: () => void
}

export function MessageInput({ contactId, contactPhone, onSent }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const maxLength = 1600 // SMS max length

  const handleSend = async () => {
    if (!message.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contactPhone,
          body: message.trim(),
          contactId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        logger.error('Failed to send message', { error: data.error })
        alert(data.error || 'Failed to send message. Please try again.')
        return
      }

      // Success - clear input and notify parent
      setMessage('')
      onSent?.()
    } catch (error) {
      logger.error('Failed to send message', { error })
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const remainingChars = maxLength - message.length

  return (
    <div className="border-t border-border p-4 md:p-4 sm:p-3 bg-background">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] resize-none md:min-h-[60px] sm:min-h-[50px]"
            maxLength={maxLength}
            disabled={isSending}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {remainingChars < 100 && (
              <span className={remainingChars < 20 ? 'text-red-600' : ''}>
                {remainingChars} characters remaining
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          size="icon"
          className="h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
