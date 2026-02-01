'use client'

/**
 * QuickCall Component
 *
 * Shows recent/frequent contacts with one-tap calling functionality.
 * Optimized for field workers who need quick access to contacts while on the road.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useUIMode } from '@/hooks/useUIMode'
import {
  Phone,
  PhoneCall,
  Search,
  User,
  Clock,
  Star,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  first_name: string
  last_name: string
  phone: string
  email?: string
  company?: string
  last_contact?: string
  call_count?: number
  priority?: 'high' | 'medium' | 'low'
}

interface QuickCallProps {
  className?: string
}

export function QuickCall({ className }: QuickCallProps) {
  const { isFieldMode } = useUIMode()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecentContacts()
  }, [])

  useEffect(() => {
    // Filter contacts based on search term
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts)
    } else {
      const filtered = contacts.filter(contact =>
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredContacts(filtered)
    }
  }, [contacts, searchTerm])

  const fetchRecentContacts = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // For now, use mock data since API endpoints aren't implemented yet
      const mockContacts: Contact[] = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Smith',
          phone: '+1-555-0123',
          email: 'john@example.com',
          company: 'ABC Construction',
          last_contact: '2024-01-15T10:30:00Z',
          call_count: 5,
          priority: 'high'
        },
        {
          id: '2',
          first_name: 'Sarah',
          last_name: 'Johnson',
          phone: '+1-555-0124',
          email: 'sarah@homeowner.com',
          last_contact: '2024-01-15T09:15:00Z',
          call_count: 2,
          priority: 'medium'
        },
        {
          id: '3',
          first_name: 'Mike',
          last_name: 'Wilson',
          phone: '+1-555-0125',
          company: 'Wilson Properties',
          last_contact: '2024-01-14T16:45:00Z',
          call_count: 8,
          priority: 'high'
        },
        {
          id: '4',
          first_name: 'Emily',
          last_name: 'Davis',
          phone: '+1-555-0126',
          email: 'emily@davis.com',
          last_contact: '2024-01-14T14:20:00Z',
          call_count: 3,
          priority: 'medium'
        },
        {
          id: '5',
          first_name: 'Robert',
          last_name: 'Brown',
          phone: '+1-555-0127',
          company: 'Brown & Associates',
          last_contact: '2024-01-13T11:30:00Z',
          call_count: 1,
          priority: 'low'
        }
      ]

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      setContacts(mockContacts)
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError('Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCall = (contact: Contact) => {
    // Use tel: protocol for native calling
    window.location.href = `tel:${contact.phone}`
  }

  const formatLastContact = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className={cn('w-full max-w-2xl mx-auto p-6', className)}>
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Quick Call
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Recent and frequent contacts for quick calling
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'pl-10',
                // Large touch targets for mobile
                isFieldMode && 'h-12 text-base'
              )}
            />
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </div>
          )}

          {/* Contacts List */}
          {!isLoading && filteredContacts.length > 0 && (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      {contact.call_count && contact.call_count > 3 && (
                        <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      )}
                      {contact.priority && (
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getPriorityColor(contact.priority))}
                        >
                          {contact.priority}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                      {contact.company && (
                        <span className="truncate">{contact.company}</span>
                      )}
                    </div>

                    {contact.last_contact && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        Last: {formatLastContact(contact.last_contact)}
                      </div>
                    )}
                  </div>

                  {/* Call Button */}
                  <Button
                    onClick={() => handleCall(contact)}
                    size={isFieldMode ? "lg" : "default"}
                    className={cn(
                      'flex-shrink-0',
                      // Large touch targets for field mode
                      isFieldMode && 'h-12 px-6'
                    )}
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredContacts.length === 0 && (
            <div className="text-center py-8">
              {searchTerm ? (
                <div>
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No contacts found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms
                  </p>
                </div>
              ) : (
                <div>
                  <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No recent contacts
                  </h3>
                  <p className="text-muted-foreground">
                    Your recent calls will appear here
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size={isFieldMode ? "lg" : "sm"}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                All Contacts
              </Button>
              <Button
                variant="outline"
                size={isFieldMode ? "lg" : "sm"}
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-2" />
                Call History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}