'use client'

/**
 * ChatMessage Component
 * Displays individual chat messages in the AI assistant
 */

import { Copy, Check, Mic, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { ChatMessage as ChatMessageType } from '@/lib/ai-assistant/types'

interface ChatMessageProps {
  message: ChatMessageType
  showTimestamp?: boolean
}

export function ChatMessage({ message, showTimestamp = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Render system messages (badges/notifications)
  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {message.content}
        </div>
      </div>
    )
  }

  // Render function call messages (collapsed cards)
  if (message.role === 'function' || message.function_call) {
    return (
      <div className="flex justify-center my-2">
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm max-w-md">
          <div className="flex items-center gap-2 text-blue-900">
            <span className="font-semibold">Function:</span>
            <code className="text-xs bg-blue-100 px-2 py-0.5 rounded">
              {message.function_call?.name || 'unknown'}
            </code>
          </div>
          {message.function_call?.result ? (
            <div className="mt-1 text-xs text-blue-700">
              Result: {typeof message.function_call.result === 'string'
                ? message.function_call.result
                : JSON.stringify(message.function_call.result).slice(0, 100)}
              {JSON.stringify(message.function_call.result).length > 100 && '...'}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // Render user or assistant messages
  const isUser = message.role === 'user'
  const isVoice = message.metadata?.voice === true

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
        {/* Message bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-200 text-gray-900 rounded-bl-sm'
          } ${message.isStreaming ? 'animate-pulse' : ''} ${message.error ? 'border-2 border-red-500' : ''}`}
        >
          {/* Voice indicator */}
          {isVoice && (
            <div className={`flex items-center gap-1 mb-1 text-xs ${isUser ? 'text-blue-100' : 'text-gray-600'}`}>
              <Mic className="h-3 w-3" />
              <span>Voice message</span>
              {message.metadata?.provider && (
                <span className="opacity-75">• {message.metadata.provider}</span>
              )}
            </div>
          )}

          {/* Message content */}
          <div className="whitespace-pre-wrap break-words text-sm md:text-base">
            {message.content}
          </div>

          {/* Error indicator */}
          {message.error && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {message.error}
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-1 px-1">
          {/* Timestamp */}
          {showTimestamp && (
            <span className="text-xs text-gray-500">
              {formatTime(message.created_at)}
            </span>
          )}

          {/* Copy button (visible on hover) */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-gray-500" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
