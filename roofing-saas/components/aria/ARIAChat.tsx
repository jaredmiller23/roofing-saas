'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Send, Loader2, Bot, User, Wrench } from 'lucide-react'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

interface ARIAChatProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'function'
  content: string
  functionName?: string
  functionSuccess?: boolean
  timestamp: Date
}

/**
 * ARIA Chat Panel
 * Slide-over panel for text-chatting with ARIA.
 * Streams responses via server-sent events from /api/aria/chat.
 */
export function ARIAChat({ isOpen, onClose }: ARIAChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Build conversation history for the API (excludes function-result display messages)
  const buildHistory = useCallback((): ChatCompletionMessageParam[] => {
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }, [messages])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    // Add user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    // Prepare assistant message placeholder
    const assistantId = `assistant_${Date.now()}`
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }])

    try {
      const response = await fetch('/api/aria/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: buildHistory(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'text') {
              // Append text to the current assistant message
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + parsed.content }
                  : m
              ))
            } else if (parsed.type === 'function_call') {
              // Show function execution
              setMessages(prev => [...prev, {
                id: `fn_${Date.now()}_${parsed.name}`,
                role: 'function',
                content: `Running ${parsed.name}...`,
                functionName: parsed.name,
                timestamp: new Date(),
              }])
            } else if (parsed.type === 'function_result') {
              // Update function result
              setMessages(prev => prev.map(m =>
                m.functionName === parsed.name && m.content.includes('Running')
                  ? {
                      ...m,
                      content: parsed.result.message || (parsed.result.success ? 'Done' : parsed.result.error || 'Failed'),
                      functionSuccess: parsed.result.success,
                    }
                  : m
              ))
            } else if (parsed.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: parsed.message || 'An error occurred.' }
                  : m
              ))
            }
          } catch {
            // Ignore parse errors for partial data
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
          : m
      ))
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, buildHistory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-full sm:w-[400px] bg-card border-l border-border shadow-xl flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">ARIA</h2>
              <p className="text-xs text-muted-foreground">AI Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-3 rounded-full bg-primary/10 mb-3">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Chat with ARIA</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Ask about contacts, projects, schedule appointments, or get business insights.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm">
                      {msg.content}
                    </div>
                    <div className="flex-shrink-0 p-1 rounded-full bg-muted">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="flex-shrink-0 p-1 rounded-full bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-muted/50 text-foreground rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                      {msg.content || (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Thinking...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {msg.role === 'function' && (
                <div className="flex justify-center">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                    msg.functionSuccess === true
                      ? 'bg-green-500/10 text-green-400'
                      : msg.functionSuccess === false
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}>
                    <Wrench className="h-3 w-3" />
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ARIA anything..."
              disabled={isStreaming}
              className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
