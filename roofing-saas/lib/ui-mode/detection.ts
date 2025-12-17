/**
 * Device Detection Logic
 *
 * Provides comprehensive device detection for automatic UI mode selection.
 * Handles SSR gracefully and uses multiple signals for accurate detection.
 */

import type { UIMode, UIModeDetectionContext } from './types'

/**
 * Raw device information collected from browser APIs
 */
export interface DeviceInfo {
  /** Current screen width in pixels */
  screenWidth: number
  /** Current screen height in pixels */
  screenHeight: number
  /** Device type based on screen size and user agent */
  deviceType: 'mobile' | 'tablet' | 'desktop'
  /** Whether the device supports touch input */
  hasTouch: boolean
  /** Primary pointer type (coarse for touch, fine for mouse) */
  pointerType: 'coarse' | 'fine' | 'none'
  /** User agent string for additional context */
  userAgent: string
  /** Whether running in server-side rendering context */
  isSSR: boolean
  /** Whether device is likely mobile based on user agent */
  isMobileUserAgent: boolean
  /** Whether device is likely tablet based on user agent */
  isTabletUserAgent: boolean
}

/**
 * Screen size thresholds for UI mode detection
 */
const SCREEN_THRESHOLDS = {
  /** Below this width suggests field mode (mobile-first) */
  FIELD_MAX: 768,
  /** Below this width suggests manager mode (tablet/small desktop) */
  MANAGER_MAX: 1024,
  /** Above this width suggests full mode (large desktop) */
  FULL_MIN: 1024,
} as const

/**
 * Detects if the device has touch capability
 */
function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // Primary touch detection
  if ('ontouchstart' in window) {
    return true
  }

  // Secondary detection via CSS media queries
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    return true
  }

  // Fallback detection for devices with any coarse pointer
  if (window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches) {
    return true
  }

  return false
}

/**
 * Detects the primary pointer type
 */
function detectPointerType(): 'coarse' | 'fine' | 'none' {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'fine' // Default assumption for SSR
  }

  if (window.matchMedia('(pointer: coarse)').matches) {
    return 'coarse'
  }

  if (window.matchMedia('(pointer: fine)').matches) {
    return 'fine'
  }

  return 'none'
}

/**
 * Parses user agent to detect mobile/tablet devices
 */
function parseUserAgent(userAgent: string): {
  isMobile: boolean
  isTablet: boolean
  deviceType: 'mobile' | 'tablet' | 'desktop'
} {
  const ua = userAgent.toLowerCase()

  // Mobile patterns
  const mobilePatterns = [
    /android.*mobile/,
    /iphone/,
    /ipod/,
    /blackberry/,
    /windows phone/,
    /mobile/
  ]

  // Tablet patterns (more specific than mobile)
  const tabletPatterns = [
    /ipad/,
    /android(?!.*mobile)/,
    /tablet/,
    /kindle/,
    /silk/
  ]

  const isMobile = mobilePatterns.some(pattern => pattern.test(ua))
  const isTablet = tabletPatterns.some(pattern => pattern.test(ua))

  // Determine device type with tablet taking precedence over mobile
  let deviceType: 'mobile' | 'tablet' | 'desktop'
  if (isTablet) {
    deviceType = 'tablet'
  } else if (isMobile) {
    deviceType = 'mobile'
  } else {
    deviceType = 'desktop'
  }

  return {
    isMobile,
    isTablet,
    deviceType
  }
}


/**
 * Collects comprehensive device information from browser APIs
 */
export function getDeviceInfo(): DeviceInfo {
  const isSSR = typeof window === 'undefined'

  // SSR defaults
  if (isSSR) {
    return {
      screenWidth: 1024,
      screenHeight: 768,
      deviceType: 'desktop',
      hasTouch: false,
      pointerType: 'fine',
      userAgent: '',
      isSSR: true,
      isMobileUserAgent: false,
      isTabletUserAgent: false,
    }
  }

  // Get screen dimensions
  const screenWidth = window.innerWidth || document.documentElement.clientWidth || 1024
  const screenHeight = window.innerHeight || document.documentElement.clientHeight || 768

  // Get user agent info
  const userAgent = navigator.userAgent || ''
  const userAgentInfo = parseUserAgent(userAgent)

  // Detect touch and pointer capabilities
  const hasTouch = detectTouchCapability()
  const pointerType = detectPointerType()

  // Determine device type (prefer user agent over screen size for accuracy)
  let deviceType = userAgentInfo.deviceType

  // If user agent suggests desktop but screen is small, trust the screen size
  if (userAgentInfo.deviceType === 'desktop' && screenWidth < SCREEN_THRESHOLDS.FIELD_MAX) {
    deviceType = 'mobile'
  }
  // If user agent suggests mobile but screen is large, it might be a tablet
  else if (userAgentInfo.deviceType === 'mobile' && screenWidth >= SCREEN_THRESHOLDS.FIELD_MAX) {
    deviceType = screenWidth >= SCREEN_THRESHOLDS.MANAGER_MAX ? 'desktop' : 'tablet'
  }

  return {
    screenWidth,
    screenHeight,
    deviceType,
    hasTouch,
    pointerType,
    userAgent,
    isSSR: false,
    isMobileUserAgent: userAgentInfo.isMobile,
    isTabletUserAgent: userAgentInfo.isTablet,
  }
}

/**
 * Detects the recommended UI mode based on device characteristics
 */
export function detectUIMode(deviceInfo?: DeviceInfo): UIMode {
  const info = deviceInfo || getDeviceInfo()

  // SSR default
  if (info.isSSR) {
    return 'full'
  }

  // Field mode criteria:
  // - Mobile devices (screen < 768px)
  // - Touch-primary devices with small screens
  if (
    info.screenWidth < SCREEN_THRESHOLDS.FIELD_MAX ||
    info.deviceType === 'mobile' ||
    (info.hasTouch && info.pointerType === 'coarse' && info.screenWidth < SCREEN_THRESHOLDS.MANAGER_MAX)
  ) {
    return 'field'
  }

  // Manager mode criteria:
  // - Medium screens (768px - 1024px)
  // - Tablets
  // - Touch-enabled devices with medium screens
  if (
    (info.screenWidth >= SCREEN_THRESHOLDS.FIELD_MAX && info.screenWidth < SCREEN_THRESHOLDS.FULL_MIN) ||
    info.deviceType === 'tablet' ||
    (info.hasTouch && info.screenWidth < SCREEN_THRESHOLDS.FULL_MIN)
  ) {
    return 'manager'
  }

  // Full mode for large screens and desktop devices
  return 'full'
}

/**
 * Creates a UIModeDetectionContext from device information
 */
export function createDetectionContext(deviceInfo?: DeviceInfo): UIModeDetectionContext {
  const info = deviceInfo || getDeviceInfo()

  // Map screen width to screen size categories
  let screenSize: 'small' | 'medium' | 'large'
  if (info.screenWidth < SCREEN_THRESHOLDS.FIELD_MAX) {
    screenSize = 'small'
  } else if (info.screenWidth < SCREEN_THRESHOLDS.FULL_MIN) {
    screenSize = 'medium'
  } else {
    screenSize = 'large'
  }

  // Detect field context based on device characteristics
  const isFieldContext = (
    info.deviceType === 'mobile' ||
    (info.hasTouch && info.pointerType === 'coarse' && screenSize === 'small') ||
    (typeof navigator !== 'undefined' && 'geolocation' in navigator && info.deviceType !== 'desktop')
  )

  return {
    deviceType: info.deviceType,
    screenSize,
    isFieldContext,
    // Note: userRole and department would come from auth context
    // These are intentionally undefined as they should be set by the app
  }
}