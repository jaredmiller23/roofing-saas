'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteContactButtonProps {
  contactId: string
}

export function DeleteContactButton({ contactId }: DeleteContactButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact? This action can be undone by an admin.')) {
      return
    }

    setIsDeleting(true)
    try {
      await apiFetch<void>(`/api/contacts/${contactId}`, { method: 'DELETE' })
      router.push('/contacts')
    } catch {
      toast.error('Failed to delete contact. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 disabled:opacity-50 flex items-center gap-2"
    >
      <Trash2 className="h-4 w-4" />
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
