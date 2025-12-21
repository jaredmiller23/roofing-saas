/**
 * Example Usage of MobileSearchBar and FieldWorkerTopBarIG with Search
 *
 * This file demonstrates how to use the new search functionality.
 * Remove this file if not needed for production.
 */

'use client'

import { useState } from 'react'
import { FieldWorkerTopBarIG } from './FieldWorkerTopBarIG'

export function MobileSearchBarExample() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  const handleSearch = (query: string) => {
    console.log('Searching for:', query)
    // Implement actual search logic here
    // e.g., navigate to search results page or trigger search API
  }

  const handleSearchClear = () => {
    setSearchQuery('')
    setIsSearchExpanded(false)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Example: Top Bar with Search</h2>

      {/* Example 1: Default Top Bar (Bell & Settings Icons) */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Default Mode (Bell & Settings)</h3>
        <FieldWorkerTopBarIG
          showHamburgerMenu
          onNotificationClick={() => console.log('Notification clicked')}
          onSettingsClick={() => console.log('Settings clicked')}
          onMenuClick={() => console.log('Menu clicked')}
        />
      </div>

      {/* Example 2: Search Mode */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Search Mode</h3>
        <FieldWorkerTopBarIG
          showHamburgerMenu
          showSearch={true}
          isSearchExpanded={isSearchExpanded}
          searchValue={searchQuery}
          searchPlaceholder="Search contacts, projects..."
          onMenuClick={() => console.log('Menu clicked')}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          onSearchClear={handleSearchClear}
          onSearchToggleExpanded={setIsSearchExpanded}
        />
      </div>

      {/* Example 3: Search Mode with Stories */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Search Mode with Stories</h3>
        <FieldWorkerTopBarIG
          showHamburgerMenu
          showSearch={true}
          showStories={true}
          stories={[
            {
              id: '1',
              userName: 'John Doe',
              userAvatar: '/api/placeholder/48/48',
              isViewed: false,
              isOwn: true
            },
            {
              id: '2',
              userName: 'Jane Smith',
              userAvatar: '/api/placeholder/48/48',
              isViewed: true,
              isOwn: false
            }
          ]}
          isSearchExpanded={isSearchExpanded}
          searchValue={searchQuery}
          searchPlaceholder="Search..."
          onMenuClick={() => console.log('Menu clicked')}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          onSearchClear={handleSearchClear}
          onSearchToggleExpanded={setIsSearchExpanded}
          onStoryClick={(story) => console.log('Story clicked:', story.userName)}
        />
      </div>

      {/* Status Display */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Current State:</h4>
        <ul className="text-sm space-y-1">
          <li>Search Query: <code>{searchQuery || '(empty)'}</code></li>
          <li>Search Expanded: <code>{isSearchExpanded.toString()}</code></li>
        </ul>
      </div>
    </div>
  )
}