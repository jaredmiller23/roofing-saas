'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Eye,
  QrCode,
  BarChart3,
  Globe,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
} from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DigitalBusinessCard } from '@/lib/digital-cards/types'
import { CardFormDialog } from '@/components/digital-cards/CardFormDialog'

export default function DigitalCardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<DigitalBusinessCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCard, setEditingCard] = useState<DigitalBusinessCard | null>(null)

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      const data = await apiFetch<{ cards: DigitalBusinessCard[] }>('/api/digital-cards')
      setCards(data.cards)
    } catch (error) {
      console.error('Error fetching cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCard = () => {
    setEditingCard(null)
    setShowCreateDialog(true)
  }

  const handleEditCard = (card: DigitalBusinessCard) => {
    setEditingCard(card)
    setShowCreateDialog(true)
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return

    try {
      await apiFetch(`/api/digital-cards/${cardId}`, {
        method: 'DELETE',
      })
      fetchCards()
    } catch (error) {
      console.error('Error deleting card:', error)
      alert('Failed to delete card')
    }
  }

  const handleCopyUrl = (slug: string) => {
    const url = `${window.location.origin}/card/${slug}`
    navigator.clipboard.writeText(url)
    alert('Card URL copied to clipboard!')
  }

  const handleViewAnalytics = (cardId: string) => {
    router.push(`/digital-cards/${cardId}/analytics`)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Digital Business Cards</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage digital business cards for your team
          </p>
        </div>
        <Button onClick={handleCreateCard}>
          <Plus className="h-4 w-4 mr-2" />
          Create Card
        </Button>
      </div>

      {/* Empty State */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Digital Cards Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first digital business card to share your contact information with a tap or scan.
            </p>
            <Button onClick={handleCreateCard}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card key={card.id} className="relative overflow-hidden">
              {/* Card Header with Brand Color */}
              <div
                className="h-24"
                style={{ backgroundColor: card.brand_color }}
              />

              <CardHeader className="relative -mt-12">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {card.profile_photo_url ? (
                      <Image
                        src={card.profile_photo_url}
                        alt={card.full_name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full border-4 border-white object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-4 border-white bg-gray-300 flex items-center justify-center text-2xl font-bold text-muted-foreground">
                        {card.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="mt-8">
                      <CardTitle className="text-lg">{card.full_name}</CardTitle>
                      {card.job_title && (
                        <CardDescription>{card.job_title}</CardDescription>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="mt-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditCard(card)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewAnalytics(card.id)}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyUrl(card.slug)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/card/${card.slug}`)}>
                        <Globe className="h-4 w-4 mr-2" />
                        View Public Card
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Company Info */}
                {card.company_name && (
                  <div>
                    <p className="text-sm font-medium">{card.company_name}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{card.total_views}</div>
                    <div className="text-xs text-muted-foreground">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{card.total_vcard_downloads}</div>
                    <div className="text-xs text-muted-foreground">Downloads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{card.total_contact_form_submissions}</div>
                    <div className="text-xs text-muted-foreground">Contacts</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/card/${card.slug}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/digital-cards/${card.id}/qr`)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center pt-2">
                  <Badge variant={card.is_active ? 'default' : 'secondary'}>
                    {card.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CardFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        card={editingCard}
        onSuccess={fetchCards}
      />
    </div>
  )
}
