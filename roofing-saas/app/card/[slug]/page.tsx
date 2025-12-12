'use client'

// =============================================
// Public Digital Business Card Page
// =============================================
// Route: /card/[slug] (PUBLIC)
// Purpose: Display digital business card to prospects
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Phone,
  Mail,
  Globe,
  Download,
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
  MapPin,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import type { PublicCardData, ContactFormData } from '@/lib/digital-cards/types'
import { downloadVCard } from '@/lib/digital-cards/vcard'
import Image from 'next/image'

export default function PublicCardPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [card, setCard] = useState<PublicCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })

  useEffect(() => {
    if (slug) {
      fetchCard()
      trackView()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const fetchCard = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/digital-cards/slug/${slug}`)
      if (!response.ok) throw new Error('Card not found')

      const data = await response.json()
      setCard(data.card)

      // Apply brand color to page
      if (data.card.brand_color) {
        document.documentElement.style.setProperty('--brand-color', data.card.brand_color)
      }
    } catch (error) {
      console.error('Error fetching card:', error)
    } finally {
      setLoading(false)
    }
  }

  const trackView = async () => {
    try {
      // Wait a bit to get card ID from fetchCard
      setTimeout(async () => {
        if (!card) return

        await fetch(`/api/digital-cards/${card.id}/interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction_type: 'view',
          }),
        })
      }, 500)
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }

  const trackInteraction = async (type: string) => {
    if (!card) return

    try {
      await fetch(`/api/digital-cards/${card.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_type: type,
        }),
      })
    } catch (error) {
      console.error('Error tracking interaction:', error)
    }
  }

  const handleDownloadVCard = () => {
    if (!card) return

    downloadVCard(card)
    trackInteraction('vcard_download')
  }

  const handlePhoneClick = () => {
    trackInteraction('phone_click')
  }

  const handleEmailClick = () => {
    trackInteraction('email_click')
  }

  const handleWebsiteClick = () => {
    trackInteraction('website_click')
  }

  const handleSocialClick = (platform: string) => {
    trackInteraction(`${platform}_click` as 'linkedin_click' | 'facebook_click' | 'instagram_click' | 'twitter_click')
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/digital-cards/${card.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to submit')

      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
      })
    } catch (error) {
      console.error('Error submitting contact form:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Card not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const services = card.services
    ? card.services.split(',').map((s) => s.trim())
    : []

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{
        background: `linear-gradient(135deg, ${card.brand_color}15 0%, ${card.brand_color}05 100%)`,
      }}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="overflow-hidden">
          {card.background_image_url && (
            <div
              className="h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${card.background_image_url})` }}
            />
          )}

          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Profile Photo */}
              {card.profile_photo_url ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <Image
                    src={card.profile_photo_url}
                    alt={card.full_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                  style={{ backgroundColor: card.brand_color }}
                >
                  {card.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}

              {/* Name & Title */}
              <div>
                <h1 className="text-3xl font-bold">{card.full_name}</h1>
                {card.job_title && (
                  <p className="text-lg text-muted-foreground mt-1">{card.job_title}</p>
                )}
                {card.company_name && (
                  <p className="text-md text-muted-foreground">{card.company_name}</p>
                )}
              </div>

              {/* Tagline */}
              {card.tagline && (
                <p
                  className="text-lg font-medium italic"
                  style={{ color: card.brand_color }}
                >
                  &ldquo;{card.tagline}&rdquo;
                </p>
              )}

              {/* Bio */}
              {card.bio && (
                <p className="text-muted-foreground max-w-lg">{card.bio}</p>
              )}

              {/* Services */}
              {services.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {services.map((service, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-sm text-white"
                      style={{ backgroundColor: card.brand_color }}
                    >
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {card.phone && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  onClick={handlePhoneClick}
                >
                  <a href={`tel:${card.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}

              {card.email && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  onClick={handleEmailClick}
                >
                  <a href={`mailto:${card.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}

              {card.company_website && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  onClick={handleWebsiteClick}
                >
                  <a href={card.company_website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadVCard}
              >
                <Download className="h-4 w-4 mr-2" />
                Save Contact
              </Button>
            </div>

            {/* Social Links */}
            {(card.linkedin_url || card.facebook_url || card.instagram_url || card.twitter_url) && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  Connect on social media
                </p>
                <div className="flex justify-center gap-3">
                  {card.linkedin_url && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSocialClick('linkedin')}
                    >
                      <a href={card.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </Button>
                  )}

                  {card.facebook_url && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSocialClick('facebook')}
                    >
                      <a href={card.facebook_url} target="_blank" rel="noopener noreferrer">
                        <Facebook className="h-5 w-5" />
                      </a>
                    </Button>
                  )}

                  {card.instagram_url && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSocialClick('instagram')}
                    >
                      <a href={card.instagram_url} target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-5 w-5" />
                      </a>
                    </Button>
                  )}

                  {card.twitter_url && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSocialClick('twitter')}
                    >
                      <a href={card.twitter_url} target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Company Address */}
            {card.company_address && (
              <div className="mt-6 pt-6 border-t text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{card.company_address}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Form */}
        {card.enable_contact_form && (
          <Card>
            <CardContent className="pt-6">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground">
                    Thank you for reaching out. {card.full_name} will get back to you soon.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-4">Get in Touch</h3>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({ ...formData, company: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        rows={4}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      style={{ backgroundColor: card.brand_color }}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by Roofing SaaS Digital Business Cards</p>
        </div>
      </div>
    </div>
  )
}
