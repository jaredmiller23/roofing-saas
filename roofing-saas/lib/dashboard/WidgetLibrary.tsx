/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

/**
 * WidgetLibrary Component
 *
 * Displays available widgets organized by category.
 * Users can drag widgets from here to add them to their dashboard.
 */

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  BarChart3,
  Calendar,
  List,
  Map,
  PieChart,
  TrendingUp,
  Users,
  Search,
  Plus,
} from 'lucide-react'
import { getAllWidgets, getWidgetsByCategory } from '@/lib/dashboard/widget-registry'
import type { WidgetDefinition, WidgetCategory, WidgetType } from '@/lib/dashboard/dashboard-types'

interface WidgetLibraryProps {
  onWidgetSelect: (widgetType: WidgetType) => void
  compact?: boolean
}

const categoryIcons: Record<WidgetCategory, React.ReactNode> = {
  metrics: <Activity className="h-4 w-4" />,
  charts: <BarChart3 className="h-4 w-4" />,
  lists: <List className="h-4 w-4" />,
  maps: <Map className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  performance: <TrendingUp className="h-4 w-4" />,
  custom: <Plus className="h-4 w-4" />,
}

export function WidgetLibrary({ onWidgetSelect, compact = false }: WidgetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all')

  const allWidgets = useMemo(() => getAllWidgets(), [])

  const filteredWidgets = useMemo(() => {
    let widgets = allWidgets

    // Filter by category
    if (selectedCategory !== 'all') {
      widgets = getWidgetsByCategory(selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      widgets = widgets.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query)
      )
    }

    return widgets
  }, [allWidgets, selectedCategory, searchQuery])

  const categories = useMemo(
    () => Array.from(new Set(allWidgets.map((w) => w.category))),
    [allWidgets]
  )

  const renderWidgetCard = (widget: WidgetDefinition) => (
    <Card
      key={widget.type}
      className="p-4 hover:border-primary cursor-pointer transition-all hover:shadow-md"
      onClick={() => onWidgetSelect(widget.type)}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          {categoryIcons[widget.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{widget.name}</h4>
            <Badge variant="outline" className="text-xs">
              {widget.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {widget.description}
          </p>
          <div className="flex gap-2 mt-2">
            {widget.supports_realtime && (
              <Badge variant="secondary" className="text-xs">
                Realtime
              </Badge>
            )}
            {widget.supports_export && (
              <Badge variant="secondary" className="text-xs">
                Export
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  )

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredWidgets.map(renderWidgetCard)}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as WidgetCategory | 'all')}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredWidgets.map(renderWidgetCard)}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {filteredWidgets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No widgets found matching your search.</p>
        </div>
      )}
    </div>
  )
}

export default WidgetLibrary
