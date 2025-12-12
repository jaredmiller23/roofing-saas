'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Download,
  MessageSquare,
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
} from 'lucide-react'
import type { PublicCardData, ContactFormData } from '@/lib/digital-cards/types'
import { parseServices } from '@/lib/digital-cards/types'

interface PublicCardViewProps {
  card: PublicCardData
}

export function PublicCardView({ card }: PublicCardViewProps) {
  const [showContactForm, setShowContactForm] = useState(false)
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const services = parseServices(card.services)

  const handleDownloadVCard = async () => {
    try {
      // Track interaction
      await fetch(`/api/digital-cards/${card.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction_type: 'vcard_download' }),
      })

      // Download vCard
      const res = await fetch(`/api/digital-cards/${card.id}/vcard`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${card.full_name.replace(/\s+/g, '-')}.vcf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading vCard:', error)
    }
  }

  const trackClick = async (type: string) => {
    try {
      await fetch(`/api/digital-cards/${card.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction_type: type }),
      })
    } catch (error) {
      console.error('Error tracking interaction:', error)
    }
  }

  const handleSubmitContactForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch(`/api/digital-cards/${card.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setSubmitted(true)
        setFormData({ name: '', email: '', phone: '', company: '', message: '' })
      } else {
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting contact form:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Brand Color */}
      <div
        className="relative h-48 md:h-64"
        style={{
          background: `linear-gradient(135deg, ${card.brand_color} 0%, ${card.brand_color}CC 100%)`,
        }}
      >
        {card.background_image_url && (
          <Image
            src={card.background_image_url}
            alt="Background"
            fill
            className="object-cover opacity-20"
          />
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 -mt-24 pb-12">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            {/* Profile Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile Photo */}
              <div className="shrink-0">
                {card.profile_photo_url ? (
                  <Image
                    src={card.profile_photo_url}
                    alt={card.full_name}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-300 flex items-center justify-center text-4xl font-bold text-gray-600">
                    {card.full_name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{card.full_name}</h1>
                {card.job_title && (
                  <p className="text-xl text-gray-600 mb-2">{card.job_title}</p>
                )}
                {card.company_name && (
                  <p className="text-lg text-gray-700 font-medium mb-3">{card.company_name}</p>
                )}
                {card.tagline && (
                  <p className="text-gray-600 italic mb-4">{card.tagline}</p>
                )}

                {/* Primary Actions */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button onClick={handleDownloadVCard}>
                    <Download className="h-4 w-4 mr-2" />
                    Save Contact
                  </Button>
                  {card.enable_contact_form && (
                    <Button
                      variant="outline"
                      onClick={() => setShowContactForm(!showContactForm)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Get in Touch
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {card.bio && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">About</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{card.bio}</p>
              </div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-3">Services</h2>
                <div className="flex flex-wrap gap-2">
                  {services.map((service, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {card.phone && (
                <a
                  href={`tel:${card.phone}`}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={() => trackClick('phone_click')}
                >
                  <Phone className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <div className="font-medium">{card.phone}</div>
                  </div>
                </a>
              )}

              {card.email && (
                <a
                  href={`mailto:${card.email}`}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={() => trackClick('email_click')}
                >
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium">{card.email}</div>
                  </div>
                </a>
              )}

              {card.company_website && (
                <a
                  href={card.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={() => trackClick('website_click')}
                >
                  <Globe className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-600">Website</div>
                    <div className="font-medium truncate">{card.company_website}</div>
                  </div>
                </a>
              )}

              {card.company_address && (
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-600">Address</div>
                    <div className="font-medium">{card.company_address}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(card.linkedin_url || card.facebook_url || card.instagram_url || card.twitter_url) && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-3">Connect</h2>
                <div className="flex gap-3">
                  {card.linkedin_url && (
                    <a
                      href={card.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => trackClick('linkedin_click')}
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                  )}
                  {card.facebook_url && (
                    <a
                      href={card.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => trackClick('facebook_click')}
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {card.instagram_url && (
                    <a
                      href={card.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => trackClick('instagram_click')}
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {card.twitter_url && (
                    <a
                      href={card.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => trackClick('twitter_click')}
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Contact Form */}
            {card.enable_contact_form && showContactForm && (
              <div className="mt-8 p-6 border rounded-lg">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-gray-600">
                      Thank you for reaching out. We&apos;ll get back to you soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitContactForm} className="space-y-4">
                    <h2 className="text-lg font-semibold mb-4">Send a Message</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Name *
                        </label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Email *
                        </label>
                        <Input
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Phone
                        </label>
                        <Input
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Company
                        </label>
                        <Input
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({ ...formData, company: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Message *
                      </label>
                      <Textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Powered by Digital Business Cards</p>
        </div>
      </div>
    </div>
  )
}
