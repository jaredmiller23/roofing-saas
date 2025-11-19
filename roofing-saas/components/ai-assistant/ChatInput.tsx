'use client'

/**
 * ChatInput Component
 * Text input for AI assistant with auto-resize and send functionality
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useAIAssistant } from '@/lib/ai-assistant/context'

interface ChatInputProps {
  onSend?: (message: string) => void
  placeholder?: string
  className?: string
}

export function ChatInput({
  onSend,
  placeholder = 'Type a message...',
  className = ''
}: ChatInputProps) {
  const { sendMessage, isSending } = useAIAssistant()
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    const message = input.trim()
    if (!message || isSending) return

    // Clear input immediately
    setInput('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Send message via callback or context
    if (onSend) {
      onSend(message)
    } else {
      await sendMessage(message)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const charCount = input.length
  const maxChars = 2000
  const isOverLimit = charCount > maxChars
  const showCharCount = charCount > maxChars * 0.8 // Show when 80% full

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Input container */}
      <div className="flex items-end gap-2">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSending}
            className={`w-full px-4 py-3 pr-12 rounded-2xl border-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              isSending
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : isOverLimit
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              minHeight: '52px',
              maxHeight: '120px',
            }}
            rows={1}
          />

          {/* Character count (floating) */}
          {showCharCount && (
            <div
              className={`absolute bottom-2 right-3 text-xs ${
                isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-400'
              }`}
            >
              {charCount}/{maxChars}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isSending || isOverLimit}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            !input.trim() || isSending || isOverLimit
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-md hover:shadow-lg'
          }`}
          title={isOverLimit ? 'Message too long' : 'Send message (Enter)'}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Helper text */}
      {!isSending && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Shift+Enter</kbd> for new line
          </p>
        </div>
      )}
    </div>
  )
}
