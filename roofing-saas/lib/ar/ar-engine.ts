/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AR Damage Assessment Engine
 * Core AR functionality for roof damage assessment
 */

import type { ARDevice, ARState, ARSession, ARMeasurement, ARPoint, ARTool, MeasurementResult } from './ar-types'

export class AREngine {
  private state: ARState
  private session?: unknown // XRSession
  private referenceSpace?: unknown // XRReferenceSpace
  private gl?: WebGL2RenderingContext
  private frame?: unknown // XRFrame
  
  constructor() {
    this.state = {
      session: null,
      device: this.detectDevice(),
      calibration: null,
      current_tool: ARTool.NONE,
      is_recording: false,
      is_measuring: false
    }
  }

  async initialize(): Promise<boolean> {
    try {
      if (!('xr' in navigator)) {
        this.state.last_error = 'WebXR not supported on this device'
        return false
      }

      const isSupported = await (navigator as { xr: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr.isSessionSupported('immersive-ar')
      if (!isSupported) {
        this.state.last_error = 'AR sessions not supported'
        return false
      }

      await this.requestPermissions()
      return true
    } catch (error) {
      this.state.last_error = 'AR initialization failed: ' + error
      return false
    }
  }

  async startSession(projectId: string): Promise<ARSession | null> {
    try {
      this.session = await (navigator as { xr?: { requestSession: (mode: string, options: unknown) => Promise<unknown> } }).xr?.requestSession('immersive-ar', {
        requiredFeatures: ['local', 'hit-test'],
        optionalFeatures: ['dom-overlay', 'camera-access']
      })

      if (!this.session) {
        throw new Error('Failed to create AR session')
      }

      const canvas = document.createElement('canvas')
      this.gl = canvas.getContext('webgl2', { xrCompatible: true }) as WebGL2RenderingContext
      
      const layer = new XRWebGLLayer(this.session, this.gl)
      await this.session.updateRenderState({ baseLayer: layer })

      this.referenceSpace = await this.session.requestReferenceSpace('local')

      const arSession: ARSession = {
        id: this.generateId(),
        project_id: projectId,
        created_at: new Date().toISOString(),
        status: 'active',
        measurements: [],
        damage_markers: [],
        photos: []
      }

      this.state.session = arSession
      this.session.requestAnimationFrame(this.onXRFrame.bind(this))

      return arSession
    } catch (error) {
      this.state.last_error = 'Failed to start AR session: ' + error
      return null
    }
  }

  async stopSession(): Promise<void> {
    if (this.session) {
      await this.session.end()
      this.session = undefined
    }

    if (this.state.session) {
      this.state.session.status = 'completed'
      this.state.session.completed_at = new Date().toISOString()
    }

    this.state.session = null
    this.state.current_tool = ARTool.NONE
    this.state.is_recording = false
    this.state.is_measuring = false
  }

  measureDistance(point1: ARPoint, point2: ARPoint): MeasurementResult {
    const distance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
      Math.pow(point2.y - point1.y, 2) +
      Math.pow(point2.z - point1.z, 2)
    )

    const distanceInFeet = distance * 3.28084

    const measurement: ARMeasurement = {
      id: this.generateId(),
      type: 'distance',
      value: distanceInFeet,
      unit: 'ft',
      points: [point1, point2],
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.85,
        accuracy: 0.1
      }
    }

    return {
      measurement,
      confidence: 0.85,
      accuracy_estimate: 0.1
    }
  }

  measureArea(points: ARPoint[]): MeasurementResult {
    if (points.length < 3) {
      throw new Error('Area measurement requires at least 3 points')
    }

    let area = 0
    for (let i = 0; i < points.length; i++) {
      const current = points[i]
      const next = points[(i + 1) % points.length]
      area += (current.x * next.y - next.x * current.y)
    }
    area = Math.abs(area) / 2

    const areaInSqFt = area * 10.7639

    const measurement: ARMeasurement = {
      id: this.generateId(),
      type: 'area',
      value: areaInSqFt,
      unit: 'sqft',
      points,
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.75,
        accuracy: 5
      }
    }

    return {
      measurement,
      confidence: 0.75,
      accuracy_estimate: 5
    }
  }

  getState(): ARState {
    return { ...this.state }
  }

  setTool(tool: ARTool): void {
    this.state.current_tool = tool
  }

  addMeasurement(measurement: ARMeasurement): void {
    if (this.state.session) {
      this.state.session.measurements.push(measurement)
    }
  }

  private onXRFrame(time: number, frame: any): void {
    this.frame = frame
    
    if (this.session) {
      this.session.requestAnimationFrame(this.onXRFrame.bind(this))
    }
  }

  private detectDevice(): ARDevice {
    const userAgent = navigator.userAgent.toLowerCase()
    const platform = userAgent.includes('android') ? 'android' : 
                    userAgent.includes('iphone') || userAgent.includes('ipad') ? 'ios' : 'web'

    return {
      platform,
      supports_ar: 'xr' in (navigator as { xr?: { requestSession: (mode: string, options: unknown) => Promise<unknown> } }),
      supports_arcore: platform === 'android' && 'xr' in (navigator as { xr?: { requestSession: (mode: string, options: unknown) => Promise<unknown> } }),
      supports_arkit: platform === 'ios' && 'xr' in (navigator as { xr?: { requestSession: (mode: string, options: unknown) => Promise<unknown> } }),
      supports_webxr: 'xr' in (navigator as { xr?: { requestSession: (mode: string, options: unknown) => Promise<unknown> } }),
      camera_permissions: false,
      motion_permissions: false
    }
  }

  private async requestPermissions(): Promise<void> {
    try {
      const cameraPermission = await navigator.mediaDevices.getUserMedia({ video: true })
      if (cameraPermission) {
        this.state.device.camera_permissions = true
        cameraPermission.getTracks().forEach(track => track.stop())
      }

      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission()
        this.state.device.motion_permissions = permission === 'granted'
      } else {
        this.state.device.motion_permissions = true
      }
    } catch (error) {
      console.warn('Permission request failed:', error)
    }
  }

  private generateId(): string {
    return 'ar_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}

export const arEngine = new AREngine()
