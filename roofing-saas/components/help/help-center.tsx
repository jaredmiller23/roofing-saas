'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Search,
  Rocket,
  Users,
  FolderKanban,
  FileText,
  GitBranch,
  UserPlus,
  MessageSquare,
  Calendar,
  BarChart3,
  CreditCard,
  ChevronRight,
  BookOpen,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HelpArticleView } from '@/components/help/help-article'
import {
  HELP_CATEGORIES,
  searchArticles,
  getArticlesByCategory,
  getArticleById,
  type HelpCategory,
  type HelpArticle,
} from '@/lib/help/articles'

type LucideIcon = typeof Rocket

const CATEGORY_ICONS: Record<HelpCategory, LucideIcon> = {
  'getting-started': Rocket,
  contacts: Users,
  projects: FolderKanban,
  estimates: FileText,
  pipeline: GitBranch,
  'team-management': UserPlus,
  'sms-email': MessageSquare,
  scheduling: Calendar,
  reports: BarChart3,
  billing: CreditCard,
}

type View =
  | { type: 'categories' }
  | { type: 'category'; category: HelpCategory }
  | { type: 'article'; articleId: string }
  | { type: 'search'; query: string }

export function HelpCenter() {
  const [view, setView] = useState<View>({ type: 'categories' })
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchArticles(searchQuery)
  }, [searchQuery])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      setView({ type: 'search', query: value })
    } else {
      setView({ type: 'categories' })
    }
  }, [])

  const handleCategoryClick = useCallback((category: HelpCategory) => {
    setSearchQuery('')
    setView({ type: 'category', category })
  }, [])

  const handleArticleClick = useCallback((articleId: string) => {
    setView({ type: 'article', articleId })
  }, [])

  const handleBackToCategories = useCallback(() => {
    setSearchQuery('')
    setView({ type: 'categories' })
  }, [])

  const handleBackToCategory = useCallback((category: HelpCategory) => {
    setView({ type: 'category', category })
  }, [])

  // Article view
  if (view.type === 'article') {
    const article = getArticleById(view.articleId)
    if (!article) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Article not found.</p>
        </div>
      )
    }
    return (
      <HelpArticleView
        article={article}
        onBack={() => handleBackToCategory(article.category)}
      />
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Find answers to common questions about managing your roofing business
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
          aria-label="Search help articles"
        />
      </div>

      {/* Search results */}
      {view.type === 'search' && (
        <SearchResults
          query={searchQuery}
          results={searchResults}
          onArticleClick={handleArticleClick}
          onClearSearch={handleBackToCategories}
        />
      )}

      {/* Category list (article list for a category) */}
      {view.type === 'category' && (
        <CategoryArticleList
          category={view.category}
          onArticleClick={handleArticleClick}
          onBack={handleBackToCategories}
        />
      )}

      {/* Category grid */}
      {view.type === 'categories' && (
        <CategoryGrid onCategoryClick={handleCategoryClick} />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

interface CategoryGridProps {
  onCategoryClick: (category: HelpCategory) => void
}

function CategoryGrid({ onCategoryClick }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {HELP_CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.id]
        const articleCount = getArticlesByCategory(cat.id).length
        return (
          <Card
            key={cat.id}
            className="cursor-pointer transition-colors hover:border-primary/50"
            onClick={() => onCategoryClick(cat.id)}
            role="button"
            tabIndex={0}
            aria-label={`${cat.label} — ${articleCount} articles`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onCategoryClick(cat.id)
              }
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {cat.label}
                    </h3>
                    <Badge variant="secondary" className="shrink-0">
                      {articleCount}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface CategoryArticleListProps {
  category: HelpCategory
  onArticleClick: (id: string) => void
  onBack: () => void
}

function CategoryArticleList({
  category,
  onArticleClick,
  onBack,
}: CategoryArticleListProps) {
  const catInfo = HELP_CATEGORIES.find((c) => c.id === category)
  const articles = getArticlesByCategory(category)
  const Icon = CATEGORY_ICONS[category]

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 transition-colors"
        aria-label="Back to all categories"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        All categories
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {catInfo?.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {catInfo?.description}
          </p>
        </div>
      </div>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-2">
          {articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              onClick={() => onArticleClick(article.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface SearchResultsProps {
  query: string
  results: HelpArticle[]
  onArticleClick: (id: string) => void
  onClearSearch: () => void
}

function SearchResults({
  query,
  results,
  onArticleClick,
  onClearSearch,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-1">
          No articles found for &ldquo;{query}&rdquo;
        </p>
        <button
          onClick={onClearSearch}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Clear search
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {results.length} {results.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
      </p>
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-2">
          {results.map((article) => {
            const catInfo = HELP_CATEGORIES.find(
              (c) => c.id === article.category
            )
            return (
              <ArticleRow
                key={article.id}
                article={article}
                categoryLabel={catInfo?.label}
                onClick={() => onArticleClick(article.id)}
              />
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

interface ArticleRowProps {
  article: HelpArticle
  categoryLabel?: string
  onClick: () => void
}

function ArticleRow({ article, categoryLabel, onClick }: ArticleRowProps) {
  // Extract first sentence for preview
  const preview = article.content.split(/[.!?]\s/)[0] + '.'

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={article.title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate">
                {article.title}
              </h3>
              {categoryLabel && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {categoryLabel}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {preview}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}
