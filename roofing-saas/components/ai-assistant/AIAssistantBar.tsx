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
  History,
} from 'lucide-react'
import { ChatHistory } from './ChatHistory'
import { ChatInput } from './ChatInput'
import { QuickActionsMenu } from './QuickActionsMenu'
import { ConversationList } from './ConversationList'
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
    loadConversations,
  } = useAIAssistant()

  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleOpenHistory = async () => {
    setShowHistory(true)
    setShowSettings(false)
    await loadConversations()
  }

  // Don't render if minimized to icon only
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={minimize}
          className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
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
        <div className="bg-white border-t-2 border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>

            {/* Input preview (click to expand) */}
            <button
              onClick={toggleExpanded}
              className="flex-1 px-4 py-2.5 text-left text-muted-foreground bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
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
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-muted-foreground hover:bg-muted'
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
              className="flex-shrink-0 p-2.5 bg-gray-100 text-muted-foreground hover:bg-muted rounded-full transition-all"
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
        <div className="bg-white border-t-2 border-gray-200 shadow-2xl animate-slide-up">
          <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'min(600px, 80vh)' }}>
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
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
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    Voice active
                  </div>
                )}
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-1">
                {/* History */}
                <button
                  onClick={handleOpenHistory}
                  className={`p-2 rounded-lg transition-colors ${
                    showHistory
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-muted-foreground hover:bg-gray-100'
                  }`}
                  title="Conversation history"
                >
                  <History className="h-4 w-4" />
                </button>

                {/* Settings */}
                <button
                  onClick={() => {
                    setShowSettings(!showSettings)
                    setShowHistory(false)
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-muted-foreground hover:bg-gray-100'
                  }`}
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {/* Minimize */}
                <button
                  onClick={toggleExpanded}
                  className="p-2 text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors"
                  title="Minimize"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Close to icon */}
                <button
                  onClick={minimize}
                  className="p-2 text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Settings panel (if open) */}
            {showSettings && (
              <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Voice Provider</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred voice provider</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg">
                      OpenAI
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground rounded-lg hover:bg-gray-300">
                      ElevenLabs
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation history panel (if open) */}
            {showHistory && (
              <div className="flex-shrink-0 border-b border-gray-200" style={{ maxHeight: '300px' }}>
                <ConversationList onClose={() => setShowHistory(false)} />
              </div>
            )}

            {/* Chat history */}
            <ChatHistory className="flex-1" />

            {/* Input area */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
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
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-gray-100 text-muted-foreground hover:bg-muted'
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
