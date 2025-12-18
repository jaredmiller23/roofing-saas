/**
 * Browser and OS detection utilities for providing system-specific instructions
 */

export interface BrowserInfo {
  os: 'macOS' | 'Windows' | 'iOS' | 'Android' | 'Linux' | 'unknown'
  browser: 'Safari' | 'Chrome' | 'Firefox' | 'Edge' | 'unknown'
  isMobile: boolean
}

/**
 * Detects the user's operating system and browser from navigator.userAgent
 * Used to provide system-specific geolocation permission instructions
 */
export function detectBrowserAndOS(): BrowserInfo {
  if (typeof window === 'undefined' || !navigator?.userAgent) {
    return {
      os: 'unknown',
      browser: 'unknown',
      isMobile: false
    }
  }

  const userAgent = navigator.userAgent.toLowerCase()

  // Detect OS
  let os: BrowserInfo['os'] = 'unknown'
  if (/iphone|ipad|ipod/.test(userAgent)) {
    os = 'iOS'
  } else if (/android/.test(userAgent)) {
    os = 'Android'
  } else if (/mac os x|macintosh/.test(userAgent)) {
    os = 'macOS'
  } else if (/windows nt|win32/.test(userAgent)) {
    os = 'Windows'
  } else if (/linux/.test(userAgent) && !/android/.test(userAgent)) {
    os = 'Linux'
  }

  // Detect browser
  let browser: BrowserInfo['browser'] = 'unknown'
  if (/edg\//.test(userAgent)) {
    browser = 'Edge'
  } else if (/firefox|fxios/.test(userAgent)) {
    browser = 'Firefox'
  } else if (/chrome|chromium|crios/.test(userAgent) && !/edg\//.test(userAgent)) {
    browser = 'Chrome'
  } else if (/safari/.test(userAgent) && !/chrome|chromium|firefox|fxios/.test(userAgent)) {
    browser = 'Safari'
  }

  // Detect if mobile
  const isMobile = /mobi|android|touch|tablet|iphone|ipad|ipod/.test(userAgent)

  return { os, browser, isMobile }
}

/**
 * Gets system-specific geolocation permission instructions
 */
export function getGeolocationInstructions(browserInfo?: BrowserInfo): string[] {
  const info = browserInfo || detectBrowserAndOS()

  // Default generic instructions
  const defaultInstructions = [
    "Check that Location Services are enabled for your browser",
    "Try refreshing the page and allowing location access when prompted"
  ]

  switch (info.os) {
    case 'macOS':
      if (info.browser === 'Safari') {
        return [
          "Check System Settings > Privacy & Security > Location Services > Safari",
          "Ensure Safari is allowed to access your location",
          "Try refreshing the page to see the permission prompt again"
        ]
      } else if (info.browser === 'Chrome') {
        return [
          "Check System Settings > Privacy & Security > Location Services > Chrome",
          "Then check chrome://settings/content/location in Chrome",
          "Ensure this site is allowed to access your location"
        ]
      }
      return [
        "Check System Settings > Privacy & Security > Location Services",
        `Ensure ${info.browser} is allowed to access your location`,
        "Try refreshing the page to see the permission prompt again"
      ]

    case 'Windows':
      if (info.browser === 'Chrome') {
        return [
          "Check chrome://settings/content/location in Chrome",
          "Ensure this site is allowed to access your location",
          "You may also need to enable Location Services in Windows Settings"
        ]
      } else if (info.browser === 'Edge') {
        return [
          "Check edge://settings/content/location in Edge",
          "Ensure this site is allowed to access your location",
          "You may also need to enable Location Services in Windows Settings"
        ]
      }
      return [
        `Check location settings in your ${info.browser} browser`,
        "Ensure this site is allowed to access your location",
        "You may also need to enable Location Services in Windows Settings"
      ]

    case 'iOS':
      if (info.browser === 'Safari') {
        return [
          "Go to Settings > Privacy & Security > Location Services > Safari",
          "Ensure Safari is allowed to access your location",
          "Try refreshing the page to see the permission prompt again"
        ]
      }
      return [
        "Go to Settings > Privacy & Security > Location Services",
        `Find your browser (${info.browser}) and enable location access`,
        "Try refreshing the page to see the permission prompt again"
      ]

    case 'Android':
      if (info.browser === 'Chrome') {
        return [
          "Go to Settings > Apps > Chrome > Permissions > Location",
          "Ensure Chrome is allowed to access your location",
          "You may also need to check Chrome's site settings for this website"
        ]
      }
      return [
        `Go to Settings > Apps > ${info.browser} > Permissions > Location`,
        `Ensure ${info.browser} is allowed to access your location`,
        "You may also need to check your browser's site settings for this website"
      ]

    case 'Linux':
      return [
        `Check location permissions in your ${info.browser} browser settings`,
        "Ensure this site is allowed to access your location",
        "Some Linux distributions may require additional system-level location service setup"
      ]

    default:
      return defaultInstructions
  }
}

/**
 * Gets a human-readable description of the detected system
 */
export function getSystemDescription(browserInfo?: BrowserInfo): string {
  const info = browserInfo || detectBrowserAndOS()

  if (info.os === 'unknown' || info.browser === 'unknown') {
    return 'your device'
  }

  const deviceType = info.isMobile ? 'mobile' : 'desktop'
  return `${info.os} ${deviceType} with ${info.browser}`
}