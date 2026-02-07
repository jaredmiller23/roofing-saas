'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { HelpArticle } from '@/lib/help/articles'

interface HelpArticleViewProps {
  article: HelpArticle
  onBack: () => void
}

type FeedbackValue = 'helpful' | 'not-helpful' | null

const FEEDBACK_STORAGE_KEY = 'help-article-feedback'

function getFeedback(articleId: string): FeedbackValue {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Record<string, FeedbackValue>
    return parsed[articleId] ?? null
  } catch {
    return null
  }
}

function setFeedback(articleId: string, value: FeedbackValue): void {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    const parsed: Record<string, FeedbackValue> = stored ? JSON.parse(stored) : {}
    if (value === null) {
      delete parsed[articleId]
    } else {
      parsed[articleId] = value
    }
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

/**
 * Renders article content with simple markup support:
 * - **bold text**
 * - Lines starting with "- " become unordered list items
 * - Lines starting with "1. ", "2. ", etc. become ordered list items
 * - Empty lines separate paragraphs
 */
function renderContent(content: string) {
  const paragraphs = content.split('\n\n')

  return paragraphs.map((paragraph, pIndex) => {
    const trimmed = paragraph.trim()
    if (!trimmed) return null

    const lines = trimmed.split('\n')

    // Check if this paragraph is a list
    const isUnorderedList = lines.every(
      (line) => line.trim().startsWith('- ') || line.trim() === ''
    )
    const isOrderedList = lines.every(
      (line) => /^\d+\.\s/.test(line.trim()) || line.trim() === ''
    )

    if (isUnorderedList) {
      return (
        <ul key={pIndex} className="list-disc list-inside space-y-1.5 mb-4 text-foreground/90">
          {lines
            .filter((line) => line.trim().startsWith('- '))
            .map((line, lIndex) => (
              <li key={lIndex} className="leading-relaxed">
                {renderInlineMarkup(line.trim().slice(2))}
              </li>
            ))}
        </ul>
      )
    }

    if (isOrderedList) {
      return (
        <ol key={pIndex} className="list-decimal list-inside space-y-1.5 mb-4 text-foreground/90">
          {lines
            .filter((line) => /^\d+\.\s/.test(line.trim()))
            .map((line, lIndex) => (
              <li key={lIndex} className="leading-relaxed">
                {renderInlineMarkup(line.trim().replace(/^\d+\.\s/, ''))}
              </li>
            ))}
        </ol>
      )
    }

    // Regular paragraph
    return (
      <p key={pIndex} className="mb-4 leading-relaxed text-foreground/90">
        {renderInlineMarkup(trimmed)}
      </p>
    )
  })
}

/**
 * Renders inline markup: **bold text**
 */
function renderInlineMarkup(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

export function HelpArticleView({ article, onBack }: HelpArticleViewProps) {
  const [feedback, setFeedbackState] = useState<FeedbackValue>(null)

  useEffect(() => {
    setFeedbackState(getFeedback(article.id))
  }, [article.id])

  const handleFeedback = useCallback(
    (value: 'helpful' | 'not-helpful') => {
      const newValue = feedback === value ? null : value
      setFeedbackState(newValue)
      setFeedback(article.id, newValue)
    },
    [article.id, feedback]
  )

  return (
    <div className="max-w-3xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        aria-label="Back to articles"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back
      </Button>

      <Card>
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            {article.title}
          </h1>

          <div className="prose-sm">{renderContent(article.content)}</div>

          {/* Feedback section */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Was this helpful?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant={feedback === 'helpful' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFeedback('helpful')}
                  aria-label="Yes, this was helpful"
                  aria-pressed={feedback === 'helpful'}
                >
                  <ThumbsUp className="h-4 w-4 mr-1.5" />
                  Yes
                </Button>
                <Button
                  variant={feedback === 'not-helpful' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFeedback('not-helpful')}
                  aria-label="No, this was not helpful"
                  aria-pressed={feedback === 'not-helpful'}
                >
                  <ThumbsDown className="h-4 w-4 mr-1.5" />
                  No
                </Button>
              </div>
              {feedback && (
                <span className="text-sm text-muted-foreground">
                  Thanks for the feedback!
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
