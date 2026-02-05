'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'

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
      await apiFetch('/api/sms/send', {
        method: 'POST',
        body: {
          to: contactPhone,
          body: message.trim(),
          contactId,
        },
      })

      // Success - clear input and notify parent
      setMessage('')
      onSent?.()
    } catch (error) {
      logger.error('Failed to send message', { error })
      toast.error(error instanceof Error ? error.message : 'Failed to send message. Please try again.')
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
    <div className="border-t border-border p-3 md:p-4 bg-background sticky bottom-0">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[50px] md:min-h-[60px] resize-none touch-manipulation text-base md:text-sm"
            maxLength={maxLength}
            disabled={isSending}
            rows={1}
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
          className="h-10 w-10 md:h-11 md:w-11 shrink-0 touch-manipulation"
        >
          <Send className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>
    </div>
  )
}
