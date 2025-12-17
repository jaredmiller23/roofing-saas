/**
 * Device Detection Logic
 *
 * Provides comprehensive device detection for automatic UI mode selection.
 * Handles SSR gracefully and uses multiple signals for accurate detection.
 *
 * P4.1 Enhancement: Added context-aware signals
 * - Time of day detection (morning/afternoon/evening)
 * - Location context (when permission granted)
 * - Motion detection (stationary vs moving)
 */

import type { UIMode, UIModeDetectionContext } from './types'

/**
 * Time of day categories for context-aware UI
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/**
 * Location permission states
 */
export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unavailable'

/**
 * Location context for field workers
 */
export interface LocationContext {
  /** Whether location permission is granted */
  permissionState: LocationPermission
  /** Whether user is likely at a job site (near a contact address) */
  isAtJobSite: boolean
  /** Whether user is likely in transit */
  isInTransit: boolean
  /** Whether user is at a known office location */
  isAtOffice: boolean
  /** Last known coordinates (if permission granted) */
  coordinates: { latitude: number; longitude: number } | null
  /** Accuracy in meters */
  accuracy: number | null
  /** Timestamp of last location update */
  lastUpdated: number | null
}

/**
 * Context-aware signals for adaptive UI
 */
export interface ContextSignals {
  /** Current time of day */
  timeOfDay: TimeOfDay
  /** Current hour (0-23) */
  currentHour: number
  /** Location context (if available) */
  location: LocationContext
  /** Whether device appears to be in motion */
  isInMotion: boolean
  /** Network connection type (if available) */
  connectionType: 'wifi' | 'cellular' | 'offline' | 'unknown'
}

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
  /** Context-aware signals (P4.1) */
  contextSignals?: ContextSignals
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

// =============================================================================
// P4.1: Context-Aware Detection Functions
// =============================================================================

/**
 * Detects the current time of day
 * Used for context-aware UI suggestions (e.g., show tomorrow's schedule in evening)
 */
export function detectTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return 'morning'     // 5am - 12pm
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon'   // 12pm - 5pm
  } else if (hour >= 17 && hour < 21) {
    return 'evening'     // 5pm - 9pm
  } else {
    return 'night'       // 9pm - 5am
  }
}

/**
 * Detects the network connection type
 * Used for offline-aware features and data sync decisions
 */
export function detectConnectionType(): 'wifi' | 'cellular' | 'offline' | 'unknown' {
  if (typeof navigator === 'undefined') {
    return 'unknown'
  }

  // Check if offline
  if (!navigator.onLine) {
    return 'offline'
  }

  // Use Network Information API if available
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; type?: string }
  }).connection

  if (connection) {
    // Check connection type
    if (connection.type === 'wifi') {
      return 'wifi'
    }
    if (connection.type === 'cellular' || connection.effectiveType?.includes('g')) {
      return 'cellular'
    }
  }

  return 'unknown'
}

/**
 * Creates default location context when location is unavailable or denied
 */
export function createDefaultLocationContext(): LocationContext {
  return {
    permissionState: 'unavailable',
    isAtJobSite: false,
    isInTransit: false,
    isAtOffice: false,
    coordinates: null,
    accuracy: null,
    lastUpdated: null,
  }
}

/**
 * Checks location permission state without triggering a prompt
 * Returns the current permission state
 */
export async function checkLocationPermission(): Promise<LocationPermission> {
  if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
    return 'unavailable'
  }

  if (!('geolocation' in navigator)) {
    return 'unavailable'
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return result.state as LocationPermission
  } catch {
    // Permissions API not fully supported
    return 'prompt'
  }
}

/**
 * Gets current location with battery-conscious settings
 * Uses low accuracy by default to conserve battery
 *
 * @param highAccuracy - Set true for high accuracy (uses more battery)
 * @param timeoutMs - Timeout in milliseconds (default 10s)
 */
export function getCurrentLocation(
  highAccuracy = false,
  timeoutMs = 10000
): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null), // Silently fail on error
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 60000, // Accept cached position up to 1 minute old
      }
    )
  })
}

/**
 * Detects context signals for adaptive UI
 * This is an async function that gathers all available context
 *
 * @param includeLocation - Whether to attempt location detection (requires permission)
 */
export async function detectContextSignals(includeLocation = false): Promise<ContextSignals> {
  const timeOfDay = detectTimeOfDay()
  const currentHour = new Date().getHours()
  const connectionType = detectConnectionType()

  // Default location context
  let location = createDefaultLocationContext()

  // Only attempt location if requested and permission might be available
  if (includeLocation) {
    const permissionState = await checkLocationPermission()
    location.permissionState = permissionState

    if (permissionState === 'granted') {
      const position = await getCurrentLocation()
      if (position) {
        location = {
          permissionState: 'granted',
          isAtJobSite: false, // Would need job site coordinates to determine
          isInTransit: false, // Would need motion data to determine
          isAtOffice: false,  // Would need office coordinates to determine
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          lastUpdated: Date.now(),
        }
      }
    }
  }

  return {
    timeOfDay,
    currentHour,
    location,
    isInMotion: false, // Would need DeviceMotion API or location history
    connectionType,
  }
}

/**
 * Gets device info with context signals (enhanced version)
 * Use this when you need context-aware detection
 *
 * @param includeLocation - Whether to include location (async, requires permission)
 */
export async function getDeviceInfoWithContext(includeLocation = false): Promise<DeviceInfo> {
  const deviceInfo = getDeviceInfo()
  const contextSignals = await detectContextSignals(includeLocation)

  return {
    ...deviceInfo,
    contextSignals,
  }
}

/**
 * Suggests UI adjustments based on context signals
 * Returns hints for the UI layer about what to show/hide
 */
export function getContextualUIHints(signals: ContextSignals): {
  showTomorrowsSchedule: boolean
  suggestFieldMode: boolean
  showOfflineIndicator: boolean
  prioritizeQuickActions: boolean
} {
  return {
    // Show tomorrow's schedule prominently in evening
    showTomorrowsSchedule: signals.timeOfDay === 'evening' || signals.timeOfDay === 'night',

    // Suggest field mode if on cellular or at job site
    suggestFieldMode:
      signals.connectionType === 'cellular' ||
      signals.location.isAtJobSite ||
      signals.location.isInTransit,

    // Show offline indicator when offline
    showOfflineIndicator: signals.connectionType === 'offline',

    // Prioritize quick actions in morning (start of day) or on mobile network
    prioritizeQuickActions:
      signals.timeOfDay === 'morning' ||
      signals.connectionType === 'cellular',
  }
}