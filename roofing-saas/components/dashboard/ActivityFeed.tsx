'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Trophy,
  Target,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  type: 'sale' | 'knock' | 'call' | 'email' | 'achievement' | 'goal'
  title: string
  description: string
  user: {
    name: string
    avatar?: string
  }
  timestamp: Date
  value?: number
  badge?: string
}

export function ActivityFeed() {
  // Mock data - in real implementation this would come from API
  const activities: Activity[] = [
    {
      id: '1',
      type: 'sale',
      title: 'New Sale Closed',
      description: 'Signed $12,500 roof replacement contract',
      user: { name: 'Sarah Johnson', avatar: '/avatars/sarah.jpg' },
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      value: 12500,
      badge: '$12.5K'
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Weekly Goal Achieved',
      description: 'Hit 50 door knocks this week',
      user: { name: 'Mike Chen', avatar: '/avatars/mike.jpg' },
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      badge: '🏆'
    },
    {
      id: '3',
      type: 'knock',
      title: 'Door Knock Session',
      description: 'Completed 8 door knocks on Maple Street',
      user: { name: 'Alex Rodriguez', avatar: '/avatars/alex.jpg' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      badge: '8 knocks'
    },
    {
      id: '4',
      type: 'call',
      title: 'Follow-up Call',
      description: 'Scheduled estimate for interested homeowner',
      user: { name: 'Emily Davis', avatar: '/avatars/emily.jpg' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    },
    {
      id: '5',
      type: 'sale',
      title: 'New Sale Closed',
      description: 'Signed $8,200 gutter replacement contract',
      user: { name: 'David Wilson', avatar: '/avatars/david.jpg' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      value: 8200,
      badge: '$8.2K'
    }
  ]

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'sale':
        return DollarSign
      case 'knock':
        return MapPin
      case 'call':
        return Phone
      case 'email':
        return Mail
      case 'achievement':
        return Trophy
      case 'goal':
        return Target
      default:
        return Clock
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'sale':
        return 'text-green-600 bg-green-100'
      case 'knock':
        return 'text-blue-600 bg-blue-100'
      case 'call':
        return 'text-purple-600 bg-purple-100'
      case 'email':
        return 'text-orange-600 bg-orange-100'
      case 'achievement':
        return 'text-yellow-600 bg-yellow-100'
      case 'goal':
        return 'text-indigo-600 bg-indigo-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getIcon(activity.type)
            const colorClass = getActivityColor(activity.type)

            return (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    {activity.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {activity.badge}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                      <AvatarFallback className="text-xs">
                        {activity.user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span>{activity.user.name}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}