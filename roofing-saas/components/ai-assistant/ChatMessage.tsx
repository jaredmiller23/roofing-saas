'use client'

/**
 * ChatMessage Component
 * Displays individual chat messages in the AI assistant
 */

import { Copy, Check, Mic, AlertCircle, Users, FileText, Search, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import type { ChatMessage as ChatMessageType } from '@/lib/ai-assistant/types'

/**
 * Format function call results into human-readable text
 */
function formatFunctionResult(functionName: string, result: unknown): { icon: React.ReactNode; text: string } | null {
  if (!result || typeof result !== 'object') return null

  const data = result as Record<string, unknown>

  // Handle error responses
  if (data.error) {
    return { icon: <AlertCircle className="h-4 w-4" />, text: `Error: ${data.error}` }
  }

  switch (functionName) {
    case 'search_contacts': {
      const contacts = data.contacts as Array<{ first_name?: string; last_name?: string; name?: string; email?: string; phone?: string }> | undefined
      const count = data.count as number || contacts?.length || 0

      if (count === 0) {
        return { icon: <Users className="h-4 w-4" />, text: 'No contacts found matching your search.' }
      }

      const names = contacts?.slice(0, 3).map(c =>
        c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown'
      ).join(', ') || ''

      const more = count > 3 ? ` and ${count - 3} more` : ''
      return { icon: <Users className="h-4 w-4" />, text: `Found ${count} contact${count === 1 ? '' : 's'}: ${names}${more}` }
    }

    case 'get_contact': {
      const contact = data.contact as { first_name?: string; last_name?: string; name?: string; email?: string; phone?: string } | undefined
      if (!contact) return { icon: <Users className="h-4 w-4" />, text: 'Contact not found.' }

      const name = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
      const details = [contact.email, contact.phone].filter(Boolean).join(' • ')
      return { icon: <Users className="h-4 w-4" />, text: `${name}${details ? ` (${details})` : ''}` }
    }

    case 'search_projects':
    case 'get_projects': {
      const projects = data.projects as Array<{ name?: string; title?: string; status?: string }> | undefined
      const count = data.count as number || projects?.length || 0

      if (count === 0) {
        return { icon: <FileText className="h-4 w-4" />, text: 'No projects found.' }
      }

      const names = projects?.slice(0, 3).map(p => p.name || p.title || 'Untitled').join(', ') || ''
      const more = count > 3 ? ` and ${count - 3} more` : ''
      return { icon: <FileText className="h-4 w-4" />, text: `Found ${count} project${count === 1 ? '' : 's'}: ${names}${more}` }
    }

    case 'create_contact':
    case 'create_project': {
      const item = (data.contact || data.project) as { name?: string; first_name?: string; last_name?: string; title?: string } | undefined
      if (!item) return { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Created successfully!' }

      const name = item.name || item.title || `${item.first_name || ''} ${item.last_name || ''}`.trim()
      return { icon: <CheckCircle2 className="h-4 w-4" />, text: `Created: ${name}` }
    }

    case 'update_contact':
    case 'update_project': {
      return { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Updated successfully!' }
    }

    default: {
      // For unknown functions, show success/count if available
      if (data.success === true) {
        const count = data.count as number | undefined
        if (count !== undefined) {
          return { icon: <Search className="h-4 w-4" />, text: `Found ${count} result${count === 1 ? '' : 's'}` }
        }
        return { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Completed successfully' }
      }
      return null
    }
  }
}

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
        <div className="px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {message.content}
        </div>
      </div>
    )
  }

  // Render function call messages (formatted nicely)
  if (message.role === 'function' || message.function_call) {
    const functionName = message.function_call?.name || 'unknown'
    const formattedResult = message.function_call?.result
      ? formatFunctionResult(functionName, message.function_call.result)
      : null

    // If we have a nicely formatted result, show it cleanly
    if (formattedResult) {
      return (
        <div className="flex justify-center my-2">
          <div className="px-4 py-2.5 bg-secondary/10 border border-secondary/30 rounded-lg text-sm max-w-md">
            <div className="flex items-center gap-2 text-secondary">
              {formattedResult.icon}
              <span className="text-foreground">{formattedResult.text}</span>
            </div>
          </div>
        </div>
      )
    }

    // Fallback: show function name with truncated result (for debugging/unknown functions)
    return (
      <div className="flex justify-center my-2">
        <div className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm max-w-md">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Processing: {functionName.replace(/_/g, ' ')}</span>
          </div>
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
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          } ${message.isStreaming ? 'animate-pulse' : ''} ${message.error ? 'border-2 border-red-500' : ''}`}
        >
          {/* Voice indicator */}
          {isVoice && (
            <div className={`flex items-center gap-1 mb-1 text-xs ${isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
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
            <span className="text-xs text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
          )}

          {/* Copy button (visible on hover) */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
