'use client'

// =============================================
// My Digital Business Card - Rep Management UI
// =============================================
// Route: /settings/my-card
// Purpose: Allow reps to create and manage their digital business card
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  Eye,
  Download,
  Copy,
  CheckCircle,
  Loader2,
  ExternalLink,
  Users,
  MousePointerClick,
  Mail,
} from 'lucide-react'
import type {
  DigitalBusinessCard,
  CardFormData,
  CardAnalyticsSummary,
  InteractionTypeSummary,
} from '@/lib/digital-cards/types'
import { DEFAULT_BRAND_COLORS, getFullCardUrl, getInteractionTypeLabel } from '@/lib/digital-cards/types'
import { downloadCardQRCode } from '@/lib/digital-cards/qrcode'

export default function MyCardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [card, setCard] = useState<DigitalBusinessCard | null>(null)
  const [formData, setFormData] = useState<CardFormData>({
    full_name: '',
    job_title: '',
    phone: '',
    email: '',
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    linkedin_url: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    tagline: '',
    bio: '',
    services: '',
    brand_color: '#3b82f6',
    enable_contact_form: true,
    enable_appointment_booking: false,
  })

  const [analytics, setAnalytics] = useState<{
    summary: CardAnalyticsSummary | null
    interactions_by_type: InteractionTypeSummary[]
  }>({
    summary: null,
    interactions_by_type: [],
  })

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchCard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCard = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ cards: DigitalBusinessCard[] }>('/api/digital-cards?user_id=current')
      if (data.cards && data.cards.length > 0) {
        const cardData = data.cards[0]
        setCard(cardData)
        populateFormFromCard(cardData)

        // Fetch analytics
        fetchAnalytics(cardData.id)
      } else {
        setCard(null)
      }
    } catch (error) {
      console.error('Error fetching card:', error)
      // Card doesn't exist yet or fetch failed
      setCard(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async (cardId: string) => {
    try {
      const data = await apiFetch<{ summary: CardAnalyticsSummary; interactions_by_type: InteractionTypeSummary[] }>(`/api/digital-cards/${cardId}/analytics?days=30`)
      setAnalytics({
        summary: data.summary,
        interactions_by_type: data.interactions_by_type,
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const populateFormFromCard = (cardData: DigitalBusinessCard) => {
    setFormData({
      full_name: cardData.full_name,
      job_title: cardData.job_title || '',
      phone: cardData.phone || '',
      email: cardData.email || '',
      company_name: cardData.company_name || '',
      company_address: cardData.company_address || '',
      company_phone: cardData.company_phone || '',
      company_email: cardData.company_email || '',
      company_website: cardData.company_website || '',
      linkedin_url: cardData.linkedin_url || '',
      facebook_url: cardData.facebook_url || '',
      instagram_url: cardData.instagram_url || '',
      twitter_url: cardData.twitter_url || '',
      tagline: cardData.tagline || '',
      bio: cardData.bio || '',
      services: cardData.services || '',
      brand_color: cardData.brand_color,
      enable_contact_form: cardData.enable_contact_form,
      enable_appointment_booking: cardData.enable_appointment_booking,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (card) {
        // Update existing card
        const data = await apiFetch<{ card: DigitalBusinessCard }>(`/api/digital-cards/${card.id}`, {
          method: 'PATCH',
          body: formData,
        })

        setCard(data.card)
      } else {
        // Create new card
        const data = await apiFetch<{ card: DigitalBusinessCard }>('/api/digital-cards', {
          method: 'POST',
          body: formData,
        })

        setCard(data.card)
      }
    } catch (error) {
      console.error('Error saving card:', error)
      alert('Failed to save card. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyUrl = () => {
    if (!card) return

    const url = getFullCardUrl(card.slug, window.location.origin)
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQRCode = async () => {
    if (!card) return

    await downloadCardQRCode(card.slug, card.full_name, window.location.origin)
  }

  const handlePreview = () => {
    if (!card) return

    window.open(`/card/${card.slug}`, '_blank')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Digital Business Card</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your digital business card
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {card && (
            <>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
          {!card && (
            <Button onClick={handleSave} disabled={saving || !formData.full_name}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Card'
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          {card && <TabsTrigger value="share">Share</TabsTrigger>}
          {card && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your name and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Your company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_phone">Company Phone</Label>
                  <Input
                    id="company_phone"
                    type="tel"
                    value={formData.company_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, company_phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_email">Company Email</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email}
                    onChange={(e) =>
                      setFormData({ ...formData, company_email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_website">Company Website</Label>
                  <Input
                    id="company_website"
                    type="url"
                    value={formData.company_website}
                    onChange={(e) =>
                      setFormData({ ...formData, company_website: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_address">Company Address</Label>
                <Textarea
                  id="company_address"
                  rows={2}
                  value={formData.company_address}
                  onChange={(e) =>
                    setFormData({ ...formData, company_address: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>Your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedin_url}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedin_url: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_url">Facebook</Label>
                  <Input
                    id="facebook_url"
                    type="url"
                    placeholder="https://facebook.com/username"
                    value={formData.facebook_url}
                    onChange={(e) =>
                      setFormData({ ...formData, facebook_url: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={formData.instagram_url}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram_url: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter_url">Twitter/X</Label>
                  <Input
                    id="twitter_url"
                    type="url"
                    placeholder="https://twitter.com/username"
                    value={formData.twitter_url}
                    onChange={(e) =>
                      setFormData({ ...formData, twitter_url: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Content */}
          <Card>
            <CardHeader>
              <CardTitle>Card Content</CardTitle>
              <CardDescription>Customize your card message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  placeholder="A short catchy phrase..."
                  maxLength={100}
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Max 100 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Tell people about yourself..."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="services">Services</Label>
                <Input
                  id="services"
                  placeholder="Roofing, Repairs, Inspections (comma-separated)"
                  value={formData.services}
                  onChange={(e) =>
                    setFormData({ ...formData, services: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple services with commas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your card appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand Color</Label>
                <div className="flex gap-2">
                  {DEFAULT_BRAND_COLORS.map((color) => (
                    <button
                      key={color}
                      className="w-10 h-10 rounded-lg border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor:
                          formData.brand_color === color ? color : 'transparent',
                        transform:
                          formData.brand_color === color ? 'scale(1.1)' : 'scale(1)',
                      }}
                      onClick={() => setFormData({ ...formData, brand_color: color })}
                    />
                  ))}
                  <Input
                    type="color"
                    className="w-10 h-10 p-1 cursor-pointer"
                    value={formData.brand_color}
                    onChange={(e) =>
                      setFormData({ ...formData, brand_color: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Card features and options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Contact Form</p>
                  <p className="text-sm text-muted-foreground">
                    Allow prospects to send you messages
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      enable_contact_form: !formData.enable_contact_form,
                    })
                  }
                >
                  {formData.enable_contact_form ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Appointment Booking</p>
                  <p className="text-sm text-muted-foreground">
                    Allow prospects to book appointments
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      enable_appointment_booking: !formData.enable_appointment_booking,
                    })
                  }
                >
                  {formData.enable_appointment_booking ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Share Tab */}
        {card && (
          <TabsContent value="share" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Share Your Card</CardTitle>
                <CardDescription>
                  Share your digital business card with prospects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Card URL */}
                <div className="space-y-2">
                  <Label>Card URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getFullCardUrl(card.slug, window.location.origin)}
                      readOnly
                    />
                    <Button variant="outline" onClick={handleCopyUrl}>
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" onClick={handlePreview}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-2">
                  <Label>QR Code</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Download your QR code to share in print materials
                  </p>
                  <Button onClick={handleDownloadQRCode}>
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>

                {/* Card Status */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Card Status</span>
                    <Badge variant={card.is_active ? 'default' : 'secondary'}>
                      {card.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Analytics Tab */}
        {card && analytics.summary && (
          <TabsContent value="analytics" className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Views
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {analytics.summary.total_views}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {analytics.summary.unique_visitors} unique visitors
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    vCard Downloads
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {analytics.summary.total_vcard_downloads}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4" />
                    Phone Clicks
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {analytics.summary.total_phone_clicks}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Forms
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {analytics.summary.total_contact_form_submissions}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Interactions Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Interactions Breakdown</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.interactions_by_type.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No interactions yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {analytics.interactions_by_type.map((item) => (
                      <div
                        key={item.interaction_type}
                        className="flex items-center justify-between border rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {getInteractionTypeLabel(item.interaction_type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.unique_ips} unique {item.unique_ips === 1 ? 'visitor' : 'visitors'}
                          </p>
                        </div>
                        <span className="text-2xl font-bold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
