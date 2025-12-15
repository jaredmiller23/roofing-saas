'use client'

/**
 * AIAssistantBar Component
 * Persistent bottom bar AI assistant (ChatGPT Mobile style)
 */

import { useState } from 'react'
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  X,
  Settings,
  Sparkles,
  History
} from 'lucide-react'
import { ChatHistory } from './ChatHistory'
import { ChatInput } from './ChatInput'
import { QuickActionsMenu } from './QuickActionsMenu'
import { AIConversationList } from './AIConversationList'
import { useAIAssistant } from '@/lib/ai-assistant/context'

export function AIAssistantBar() {
  const {
    isExpanded,
    isMinimized,
    toggleExpanded,
    minimize,
    voiceSessionActive,
    startVoiceSession,
    endVoiceSession,
    messages,
  } = useAIAssistant()

  const [showSettings, setShowSettings] = useState(false)
  const [showConversations, setShowConversations] = useState(false)

  // Don't render if minimized to icon only
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={minimize}
          className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
          title="Open AI Assistant"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      </div>
    )
  }

  // Collapsed state (bottom bar only)
  if (!isExpanded) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:left-64">
        <div className="bg-card border-t-2 border-border shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>

            {/* Input preview (click to expand) */}
            <button
              onClick={toggleExpanded}
              className="flex-1 px-4 py-2.5 text-left text-muted-foreground bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              Ask anything...
            </button>

            {/* Voice button */}
            <button
              onClick={() => {
                if (voiceSessionActive) {
                  endVoiceSession()
                } else {
                  startVoiceSession()
                }
              }}
              className={`flex-shrink-0 p-2.5 rounded-full transition-all ${
                voiceSessionActive
                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              title={voiceSessionActive ? 'Stop voice session' : 'Start voice session'}
            >
              {voiceSessionActive ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Quick actions */}
            <QuickActionsMenu />

            {/* Expand button */}
            <button
              onClick={toggleExpanded}
              className="flex-shrink-0 p-2.5 bg-muted text-muted-foreground hover:bg-muted/80 rounded-full transition-all"
              title="Expand assistant"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Expanded state (full chat interface)
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30 lg:left-64"
        onClick={toggleExpanded}
      />

      {/* Expanded chat window */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:left-64">
        <div className="bg-card border-t-2 border-border shadow-2xl animate-slide-up">
          <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'min(600px, 80vh)' }}>
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">
                    {messages.length === 0
                      ? 'Ready to help'
                      : `${messages.length} message${messages.length === 1 ? '' : 's'}`}
                  </p>
                </div>

                {/* Voice session indicator */}
                {voiceSessionActive && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    Voice active
                  </div>
                )}
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-1">
                {/* Conversation History */}
                <button
                  onClick={() => {
                    setShowConversations(!showConversations)
                    setShowSettings(false)
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showConversations
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title="Conversation history"
                >
                  <History className="h-4 w-4" />
                </button>

                {/* Settings */}
                <button
                  onClick={() => {
                    setShowSettings(!showSettings)
                    setShowConversations(false)
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {/* Minimize */}
                <button
                  onClick={toggleExpanded}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Minimize"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Close to icon */}
                <button
                  onClick={minimize}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Settings panel (if open) */}
            {showSettings && (
              <div className="flex-shrink-0 px-4 py-3 bg-muted border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Voice Provider</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred voice provider</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg">
                      OpenAI
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-muted/80">
                      ElevenLabs
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation list panel (if open) */}
            {showConversations ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Conversations sidebar */}
                <div className="w-72 border-r border-border">
                  <AIConversationList onClose={() => setShowConversations(false)} />
                </div>

                {/* Chat history */}
                <div className="flex-1">
                  <ChatHistory className="h-full" />
                </div>
              </div>
            ) : (
              /* Chat history (full width when conversation list closed) */
              <ChatHistory className="flex-1" />
            )}

            {/* Input area */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
              <div className="flex items-end gap-2">
                {/* Quick actions */}
                <div className="flex-shrink-0">
                  <QuickActionsMenu />
                </div>

                {/* Text input */}
                <div className="flex-1">
                  <ChatInput placeholder="Ask anything..." />
                </div>

                {/* Voice button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => {
                      if (voiceSessionActive) {
                        endVoiceSession()
                      } else {
                        startVoiceSession()
                      }
                    }}
                    className={`p-3 rounded-full transition-all ${
                      voiceSessionActive
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    title={voiceSessionActive ? 'Stop voice' : 'Start voice'}
                  >
                    {voiceSessionActive ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
