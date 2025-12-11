'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DigitalBusinessCard } from '@/lib/digital-cards/types'
import { DEFAULT_BRAND_COLORS, generateSlugFromName } from '@/lib/digital-cards/types'

const cardFormSchema = z.object({
  // Personal
  full_name: z.string().min(1, 'Name is required'),
  job_title: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),

  // Company
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().email('Invalid email').optional().or(z.literal('')),
  company_website: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Social
  linkedin_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  facebook_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  instagram_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  twitter_url: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Content
  tagline: z.string().optional(),
  bio: z.string().optional(),
  services: z.string().optional(),

  // Branding
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),

  // Settings
  slug: z.string().optional(),
  enable_contact_form: z.boolean(),
  enable_appointment_booking: z.boolean(),
})

type CardFormData = z.infer<typeof cardFormSchema>

interface CardFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: DigitalBusinessCard | null
  onSuccess: () => void
}

export function CardFormDialog({
  open,
  onOpenChange,
  card,
  onSuccess,
}: CardFormDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const isEditing = !!card

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
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
      brand_color: DEFAULT_BRAND_COLORS[0],
      slug: '',
      enable_contact_form: true,
      enable_appointment_booking: false,
    },
  })

  useEffect(() => {
    if (card) {
      form.reset({
        full_name: card.full_name,
        job_title: card.job_title || '',
        phone: card.phone || '',
        email: card.email || '',
        company_name: card.company_name || '',
        company_address: card.company_address || '',
        company_phone: card.company_phone || '',
        company_email: card.company_email || '',
        company_website: card.company_website || '',
        linkedin_url: card.linkedin_url || '',
        facebook_url: card.facebook_url || '',
        instagram_url: card.instagram_url || '',
        twitter_url: card.twitter_url || '',
        tagline: card.tagline || '',
        bio: card.bio || '',
        services: card.services || '',
        brand_color: card.brand_color,
        slug: card.slug,
        enable_contact_form: card.enable_contact_form,
        enable_appointment_booking: card.enable_appointment_booking,
      })
    } else {
      form.reset({
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
        brand_color: DEFAULT_BRAND_COLORS[0],
        slug: '',
        enable_contact_form: true,
        enable_appointment_booking: false,
      })
    }
  }, [card, form])

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing) {
      const subscription = form.watch((value, { name }) => {
        if (name === 'full_name' && value.full_name) {
          const slug = generateSlugFromName(value.full_name)
          form.setValue('slug', slug)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [form, isEditing])

  const onSubmit = async (data: CardFormData) => {
    setSubmitting(true)
    try {
      const url = isEditing ? `/api/digital-cards/${card.id}` : '/api/digital-cards'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
        form.reset()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving card:', error)
      alert('Failed to save card')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Digital Card' : 'Create Digital Card'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your digital business card information'
              : 'Create a new digital business card for your team member'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Sales Manager" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 (555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Roofing Expert | 10+ Years Experience" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell your story..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="services"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Services (comma-separated)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Roof Repair, Roof Replacement, Inspections"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Company Tab */}
              <TabsContent value="company" className="space-y-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Acme Roofing Co." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main St, Nashville, TN 37201" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 (555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="info@acmeroofing.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="company_website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Website</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://acmeroofing.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Social Tab */}
              <TabsContent value="social" className="space-y-4">
                <FormField
                  control={form.control}
                  name="linkedin_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://linkedin.com/in/johndoe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://facebook.com/johndoe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instagram_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://instagram.com/johndoe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="twitter_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://twitter.com/johndoe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <FormField
                  control={form.control}
                  name="brand_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Color</FormLabel>
                      <div className="flex gap-2">
                        {DEFAULT_BRAND_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-10 h-10 rounded-full border-2 ${
                              field.value === color
                                ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                      <FormControl>
                        <Input {...field} placeholder="#3b82f6" className="mt-2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card URL Slug</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">/card/</span>
                          <Input {...field} placeholder="john-doe" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_contact_form"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Contact Form</FormLabel>
                        <div className="text-sm text-gray-600">
                          Allow visitors to send you messages
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_appointment_booking"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Appointment Booking</FormLabel>
                        <div className="text-sm text-gray-600">
                          Allow visitors to book appointments
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : isEditing ? 'Update Card' : 'Create Card'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
