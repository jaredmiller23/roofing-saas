'use client'

import * as React from 'react'
import { ChevronsUpDown, MapPin, User, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { apiFetchPaginated } from '@/lib/api/client'

interface AddressData {
  location: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
}

interface AddressOption {
  id: string
  type: 'contact' | 'project'
  name: string
  address: AddressData
}

interface AddressLookupProps {
  onSelect: (address: AddressData) => void
  className?: string
}

export function AddressLookup({ onSelect, className }: AddressLookupProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<AddressOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  // Fetch contacts and projects when opened
  const fetchOptions = React.useCallback(async () => {
    if (loaded) return
    setLoading(true)
    try {
      interface Contact {
        id: string
        first_name: string | null
        last_name: string | null
        address_street: string | null
        address_city: string | null
        address_state: string | null
        address_zip: string | null
      }

      interface Project {
        id: string
        name: string
        address_street: string | null
        address_city: string | null
        address_state: string | null
        address_zip: string | null
      }

      // Fetch contacts and projects in parallel
      const [contactsRes, projectsRes] = await Promise.all([
        apiFetchPaginated<Contact[]>('/api/contacts?limit=50'),
        apiFetchPaginated<Project[]>('/api/projects?limit=50'),
      ])

      const contactOptions: AddressOption[] = contactsRes.data
        .filter((c) => c.address_street || c.address_city) // Only include contacts with addresses
        .map((contact) => ({
          id: contact.id,
          type: 'contact' as const,
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact',
          address: {
            location: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Contact Address',
            address_street: contact.address_street || '',
            address_city: contact.address_city || '',
            address_state: contact.address_state || '',
            address_zip: contact.address_zip || '',
          },
        }))

      const projectOptions: AddressOption[] = projectsRes.data
        .filter((p) => p.address_street || p.address_city) // Only include projects with addresses
        .map((project) => ({
          id: project.id,
          type: 'project' as const,
          name: project.name,
          address: {
            location: project.name,
            address_street: project.address_street || '',
            address_city: project.address_city || '',
            address_state: project.address_state || '',
            address_zip: project.address_zip || '',
          },
        }))

      setOptions([...contactOptions, ...projectOptions])
      setLoaded(true)
    } catch (error) {
      console.error('Failed to fetch address options:', error)
    } finally {
      setLoading(false)
    }
  }, [loaded])

  // Fetch when popover opens
  React.useEffect(() => {
    if (open && !loaded) {
      fetchOptions()
    }
  }, [open, loaded, fetchOptions])

  const handleSelect = (option: AddressOption) => {
    onSelect(option.address)
    setOpen(false)
  }

  const formatAddress = (addr: AddressData) => {
    const parts = [addr.address_street, addr.address_city, addr.address_state, addr.address_zip].filter(Boolean)
    return parts.join(', ')
  }

  const contacts = options.filter((o) => o.type === 'contact')
  const projects = options.filter((o) => o.type === 'project')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Load from contact or project...</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search contacts and projects..." />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty>No addresses found.</CommandEmpty>
            )}
            {contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {contacts.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.name} ${formatAddress(option.address)}`}
                    onSelect={() => handleSelect(option)}
                    className="flex flex-col items-start py-2"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{option.name}</span>
                    </div>
                    <span className="ml-6 text-xs text-muted-foreground">
                      {formatAddress(option.address)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {projects.length > 0 && (
              <CommandGroup heading="Projects">
                {projects.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.name} ${formatAddress(option.address)}`}
                    onSelect={() => handleSelect(option)}
                    className="flex flex-col items-start py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{option.name}</span>
                    </div>
                    <span className="ml-6 text-xs text-muted-foreground">
                      {formatAddress(option.address)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
