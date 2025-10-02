'use client'

/**
 * Offline Fallback Page
 * Displayed when user is offline and tries to navigate
 */

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="flex justify-center mb-6">
          <WifiOff className="w-24 h-24 text-gray-400" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You&apos;re Offline
        </h1>

        <p className="text-gray-600 mb-6">
          It looks like you&apos;ve lost your internet connection. Don&apos;t worry - you can still:
        </p>

        <ul className="text-left text-gray-700 space-y-3 mb-8">
          <li className="flex items-start">
            <span className="mr-2">📸</span>
            <span>Take photos (they'll sync when you're back online)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">👥</span>
            <span>View cached contact information</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">📍</span>
            <span>View territory maps (if previously loaded)</span>
          </li>
        </ul>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Any photos you take will be automatically uploaded when you reconnect to the internet.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>

        <p className="text-xs text-gray-500 mt-6">
          When your connection is restored, this page will automatically update.
        </p>
      </div>
    </div>
  );
}
