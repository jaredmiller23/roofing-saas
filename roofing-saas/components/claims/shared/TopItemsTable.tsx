'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalRateBadge } from './ApprovalRateBadge'

interface TopItemsTableProps<T> {
  title: string
  items: T[]
  loading?: boolean
  emptyMessage?: string
  maxItems?: number
  renderItem: (item: T, index: number) => TopItemRow
}

interface TopItemRow {
  name: string
  count: number
  rate?: number // Optional percentage (0-100)
  rateLabel?: string // e.g., "win rate", "appeal success"
}

/**
 * TopItemsTable - Reusable ranked list with counts and optional rates
 *
 * @example
 * <TopItemsTable
 *   title="Top Disputed Items"
 *   items={disputedItems}
 *   renderItem={(item) => ({
 *     name: item.item,
 *     count: item.count,
 *     rate: item.win_rate,
 *     rateLabel: "win rate"
 *   })}
 * />
 */
export function TopItemsTable<T>({
  title,
  items,
  loading = false,
  emptyMessage = 'No data available',
  maxItems = 10,
  renderItem,
}: TopItemsTableProps<T>) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    )
  }

  const displayItems = items.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableBody>
            {displayItems.map((item, index) => {
              const row = renderItem(item, index)
              return (
                <TableRow key={index}>
                  <TableCell className="w-8 font-medium text-muted-foreground">
                    {index + 1}.
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{row.count}x</Badge>
                  </TableCell>
                  {row.rate !== undefined && (
                    <TableCell className="text-right">
                      <ApprovalRateBadge rate={row.rate} size="sm" />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/**
 * TopArgumentsTable - Specialized variant for effective arguments
 * Shows success count instead of rate
 */
interface TopArgumentsTableProps {
  title: string
  items: Array<{ argument: string; success_count: number }>
  loading?: boolean
  maxItems?: number
}

export function TopArgumentsTable({
  title,
  items,
  loading = false,
  maxItems = 10,
}: TopArgumentsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No effective arguments recorded yet
          </p>
        </CardContent>
      </Card>
    )
  }

  const displayItems = items.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableBody>
            {displayItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="w-8 font-medium text-muted-foreground">
                  {index + 1}.
                </TableCell>
                <TableCell className="font-medium">{item.argument}</TableCell>
                <TableCell className="text-right">
                  <Badge className="bg-green-500 text-white">
                    {item.success_count} wins
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
