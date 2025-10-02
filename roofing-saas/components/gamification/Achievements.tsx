'use client'

import { useEffect, useState } from 'react'
import { Trophy, Lock, CheckCircle, Star } from 'lucide-react'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points_required?: number
  category: string
  unlocked: boolean
  unlocked_at?: string
}

export function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState({ total: 0, unlocked: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchAchievements()
  }, [])

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/gamification/achievements')
      const result = await response.json()

      if (result.success) {
        setAchievements(result.data.achievements)
        setStats({
          total: result.data.total,
          unlocked: result.data.unlocked
        })
      }
    } catch (error) {
      console.error('Error fetching achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique categories
  const categories = ['all', ...new Set(achievements.map(a => a.category))]

  // Filter achievements by category
  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory)

  const getIconComponent = (iconName: string, unlocked: boolean) => {
    const className = `h-8 w-8 ${unlocked ? 'text-yellow-500' : 'text-gray-400'}`

    switch (iconName) {
      case 'trophy':
        return <Trophy className={className} />
      case 'star':
        return <Star className={className} />
      case 'check':
        return <CheckCircle className={className} />
      default:
        return <Trophy className={className} />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
          <div className="text-sm text-gray-600">
            {stats.unlocked} / {stats.total} Unlocked
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedCategory === category
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Achievements Grid */}
      {!loading && filteredAchievements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border transition-all ${
                achievement.unlocked
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-gray-50 border-gray-200 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="relative">
                  {getIconComponent(achievement.icon, achievement.unlocked)}
                  {!achievement.unlocked && (
                    <Lock className="h-4 w-4 text-gray-500 absolute -bottom-1 -right-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className={`font-medium mb-1 ${
                    achievement.unlocked ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {achievement.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {achievement.description}
                  </p>

                  {/* Points or Progress */}
                  {achievement.unlocked ? (
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-green-700">
                        Unlocked {new Date(achievement.unlocked_at!).toLocaleDateString()}
                      </span>
                    </div>
                  ) : achievement.points_required ? (
                    <div className="text-xs text-gray-500">
                      Requires {achievement.points_required.toLocaleString()} points
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAchievements.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No achievements in this category</p>
        </div>
      )}
    </div>
  )
}