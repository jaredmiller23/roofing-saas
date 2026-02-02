'use client'

/**
 * ChatMessage Component
 * Displays individual chat messages in the AI assistant
 */

import { Copy, Check, Mic, AlertCircle, Users, FileText, Search, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChatMessage as ChatMessageType } from '@/lib/ai-assistant/types'

interface ContactResult {
  id?: string
  first_name?: string
  last_name?: string
  name?: string
  email?: string
  phone?: string
}

interface ProjectResult {
  id?: string
  name?: string
  title?: string
  status?: string
}

/**
 * Format function call results into human-readable content
 * Returns either text or a React node for interactive results
 */
function formatFunctionResult(
  functionName: string,
  result: unknown,
  onNavigate?: (path: string) => void
): { icon: React.ReactNode; content: React.ReactNode } | null {
  if (!result || typeof result !== 'object') return null

  const data = result as Record<string, unknown>

  // Handle error responses
  if (data.error) {
    return { icon: <AlertCircle className="h-4 w-4" />, content: `Error: ${data.error}` }
  }

  switch (functionName) {
    case 'search_contacts': {
      const contacts = data.contacts as ContactResult[] | undefined
      const count = data.count as number || contacts?.length || 0

      if (count === 0) {
        return { icon: <Users className="h-4 w-4" />, content: 'No contacts found matching your search.' }
      }

      // Create clickable contact links
      const contactLinks = contacts?.slice(0, 5).map((c, index) => {
        const name = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown'
        const hasId = !!c.id

        if (hasId && onNavigate) {
          return (
            <button
              key={c.id || index}
              onClick={() => onNavigate(`/contacts/${c.id}`)}
              className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
            >
              {name}
            </button>
          )
        }
        return <span key={index}>{name}</span>
      })

      const more = count > 5 ? ` and ${count - 5} more` : ''

      return {
        icon: <Users className="h-4 w-4" />,
        content: (
          <span>
            Found {count} contact{count === 1 ? '' : 's'}:{' '}
            {contactLinks?.map((link, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {link}
              </span>
            ))}
            {more}
          </span>
        )
      }
    }

    case 'get_contact': {
      const contact = data.contact as ContactResult | undefined
      if (!contact) return { icon: <Users className="h-4 w-4" />, content: 'Contact not found.' }

      const name = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
      const details = [contact.email, contact.phone].filter(Boolean).join(' • ')

      if (contact.id && onNavigate) {
        return {
          icon: <Users className="h-4 w-4" />,
          content: (
            <span>
              <button
                onClick={() => onNavigate(`/contacts/${contact.id}`)}
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
              >
                {name}
              </button>
              {details ? ` (${details})` : ''}
            </span>
          )
        }
      }

      return { icon: <Users className="h-4 w-4" />, content: `${name}${details ? ` (${details})` : ''}` }
    }

    case 'search_projects':
    case 'get_projects': {
      const projects = data.projects as ProjectResult[] | undefined
      const count = data.count as number || projects?.length || 0

      if (count === 0) {
        return { icon: <FileText className="h-4 w-4" />, content: 'No projects found.' }
      }

      // Create clickable project links
      const projectLinks = projects?.slice(0, 5).map((p, index) => {
        const name = p.name || p.title || 'Untitled'
        const hasId = !!p.id

        if (hasId && onNavigate) {
          return (
            <button
              key={p.id || index}
              onClick={() => onNavigate(`/projects/${p.id}`)}
              className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
            >
              {name}
            </button>
          )
        }
        return <span key={index}>{name}</span>
      })

      const more = count > 5 ? ` and ${count - 5} more` : ''

      return {
        icon: <FileText className="h-4 w-4" />,
        content: (
          <span>
            Found {count} project{count === 1 ? '' : 's'}:{' '}
            {projectLinks?.map((link, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {link}
              </span>
            ))}
            {more}
          </span>
        )
      }
    }

    case 'create_contact': {
      const contact = data.contact as ContactResult | undefined
      if (!contact) return { icon: <CheckCircle2 className="h-4 w-4" />, content: 'Created successfully!' }

      const name = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()

      if (contact.id && onNavigate) {
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          content: (
            <span>
              Created:{' '}
              <button
                onClick={() => onNavigate(`/contacts/${contact.id}`)}
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
              >
                {name}
              </button>
            </span>
          )
        }
      }

      return { icon: <CheckCircle2 className="h-4 w-4" />, content: `Created: ${name}` }
    }

    case 'create_project': {
      const project = data.project as ProjectResult | undefined
      if (!project) return { icon: <CheckCircle2 className="h-4 w-4" />, content: 'Created successfully!' }

      const name = project.name || project.title || 'Untitled'

      if (project.id && onNavigate) {
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          content: (
            <span>
              Created:{' '}
              <button
                onClick={() => onNavigate(`/projects/${project.id}`)}
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
              >
                {name}
              </button>
            </span>
          )
        }
      }

      return { icon: <CheckCircle2 className="h-4 w-4" />, content: `Created: ${name}` }
    }

    case 'update_contact':
    case 'update_project': {
      return { icon: <CheckCircle2 className="h-4 w-4" />, content: 'Updated successfully!' }
    }

    default: {
      // For unknown functions, show success/count if available
      if (data.success === true) {
        const count = data.count as number | undefined
        if (count !== undefined) {
          return { icon: <Search className="h-4 w-4" />, content: `Found ${count} result${count === 1 ? '' : 's'}` }
        }
        return { icon: <CheckCircle2 className="h-4 w-4" />, content: 'Completed successfully' }
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
  const router = useRouter()

  // Navigation handler for clickable results
  const handleNavigate = (path: string) => {
    router.push(path)
  }

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
      ? formatFunctionResult(functionName, message.function_call.result, handleNavigate)
      : null

    // If we have a nicely formatted result, show it cleanly
    if (formattedResult) {
      return (
        <div className="flex justify-center my-2">
          <div className="px-4 py-2.5 bg-secondary/10 border border-secondary/30 rounded-lg text-sm max-w-md">
            <div className="flex items-start gap-2 text-secondary">
              <span className="mt-0.5">{formattedResult.icon}</span>
              <span className="text-foreground">{formattedResult.content}</span>
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
            <div className="mt-2 text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded">
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
