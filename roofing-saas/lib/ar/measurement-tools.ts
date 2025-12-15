/**
 * AR Measurement Tools
 * Specialized tools for different types of measurements in AR
 */

import { ARPoint, ARMeasurement, MeasurementResult, ARTool } from './ar-types'
import { arEngine } from './ar-engine'

export class MeasurementTools {
  private activePoints: ARPoint[] = []
  private currentTool: ARTool = ARTool.NONE

  /**
   * Start a new measurement with the specified tool
   */
  startMeasurement(tool: ARTool): void {
    this.currentTool = tool
    this.activePoints = []
    arEngine.setTool(tool)
  }

  /**
   * Add a point to the current measurement
   */
  addPoint(point: ARPoint): void {
    this.activePoints.push(point)
  }

  /**
   * Complete the current measurement and return the result
   */
  completeMeasurement(): MeasurementResult | null {
    switch (this.currentTool) {
      case ARTool.DISTANCE:
        return this.completeDistanceMeasurement()
      case ARTool.AREA:
        return this.completeAreaMeasurement()
      case ARTool.ANGLE:
        return this.completeAngleMeasurement()
      default:
        return null
    }
  }

  /**
   * Cancel the current measurement
   */
  cancelMeasurement(): void {
    this.activePoints = []
    this.currentTool = ARTool.NONE
    arEngine.setTool(ARTool.NONE)
  }

  /**
   * Get the current points being measured
   */
  getActivePoints(): ARPoint[] {
    return [...this.activePoints]
  }

  /**
   * Check if enough points are collected for the current tool
   */
  hasEnoughPoints(): boolean {
    switch (this.currentTool) {
      case ARTool.DISTANCE:
        return this.activePoints.length >= 2
      case ARTool.AREA:
        return this.activePoints.length >= 3
      case ARTool.ANGLE:
        return this.activePoints.length >= 3
      default:
        return false
    }
  }

  /**
   * Complete distance measurement
   */
  private completeDistanceMeasurement(): MeasurementResult | null {
    if (this.activePoints.length < 2) {
      return null
    }

    const point1 = this.activePoints[0]
    const point2 = this.activePoints[1]
    
    const result = arEngine.measureDistance(point1, point2)
    arEngine.addMeasurement(result.measurement)
    
    this.cancelMeasurement()
    return result
  }

  /**
   * Complete area measurement
   */
  private completeAreaMeasurement(): MeasurementResult | null {
    if (this.activePoints.length < 3) {
      return null
    }

    const result = arEngine.measureArea(this.activePoints)
    arEngine.addMeasurement(result.measurement)
    
    this.cancelMeasurement()
    return result
  }

  /**
   * Complete angle measurement
   */
  private completeAngleMeasurement(): MeasurementResult | null {
    if (this.activePoints.length < 3) {
      return null
    }

    const [point1, vertex, point2] = this.activePoints

    // Calculate vectors from vertex to the other points
    const vector1 = {
      x: point1.x - vertex.x,
      y: point1.y - vertex.y,
      z: point1.z - vertex.z
    }

    const vector2 = {
      x: point2.x - vertex.x,
      y: point2.y - vertex.y,
      z: point2.z - vertex.z
    }

    // Calculate dot product
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z

    // Calculate magnitudes
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y + vector1.z * vector1.z)
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y + vector2.z * vector2.z)

    // Calculate angle in radians, then convert to degrees
    const angleRad = Math.acos(dotProduct / (magnitude1 * magnitude2))
    const angleDeg = angleRad * (180 / Math.PI)

    const measurement: ARMeasurement = {
      id: this.generateId(),
      type: 'angle',
      value: angleDeg,
      unit: 'degrees',
      points: this.activePoints,
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.80,
        accuracy: 2 // ±2 degrees
      }
    }

    const result: MeasurementResult = {
      measurement,
      confidence: 0.80,
      accuracy_estimate: 2
    }

    arEngine.addMeasurement(measurement)
    this.cancelMeasurement()
    return result
  }

  /**
   * Calculate roof pitch from angle measurement
   */
  calculateRoofPitch(angleDegrees: number): { rise: number; run: number; pitch: string } {
    // Convert angle to slope ratio
    const angleRad = angleDegrees * (Math.PI / 180)
    const rise = Math.tan(angleRad) * 12 // Rise per 12 inches of run
    
    return {
      rise: Math.round(rise * 100) / 100,
      run: 12,
      pitch: Math.round(rise) + '/12'
    }
  }

  /**
   * Estimate measurement accuracy based on distance and conditions
   */
  estimateAccuracy(points: ARPoint[]): number {
    if (points.length === 0) return 0

    // Calculate average distance from camera (assuming camera is at origin)
    const avgDistance = points.reduce((sum, point) => {
      const distance = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
      return sum + distance
    }, 0) / points.length

    // Accuracy decreases with distance
    // Base accuracy: ±5cm at 2m, degrading linearly
    const baseAccuracy = 0.05 // 5cm at 2m
    const accuracyDegradation = 0.02 // +2cm per meter
    
    return baseAccuracy + (avgDistance - 2) * accuracyDegradation
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'measure_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}

// Export singleton instance
export const measurementTools = new MeasurementTools()
