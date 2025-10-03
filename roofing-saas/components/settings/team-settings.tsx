'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Crown, Shield } from 'lucide-react'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  joined_at: string
}

interface TeamSettingsProps {
  members: TeamMember[]
  currentUserId: string
}

export function TeamSettings({ members, currentUserId }: TeamSettingsProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-yellow-100 text-yellow-800',
      manager: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800',
    }
    return badges[role as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Manage your team and their roles ({members.length} member{members.length !== 1 ? 's' : ''})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                member.id === currentUserId ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {(member.full_name || member.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {member.full_name || member.email}
                    </p>
                    {member.id === currentUserId && (
                      <span className="text-xs text-blue-600 font-medium">(You)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  <p className="text-xs text-gray-400">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleIcon(member.role)}
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${getRoleBadge(
                    member.role
                  )}`}
                >
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No team members found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
