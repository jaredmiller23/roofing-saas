'use client'

import { useState } from 'react'
import { DamageMarker as DamageMarkerType, DamageType, DamageSeverity } from '@/lib/ar/ar-types'
import { damageClassifier } from '@/lib/ar/damage-classifier'
import { AlertTriangle, Camera, Edit3, Trash2, MapPin } from 'lucide-react'

interface DamageMarkerProps {
  marker: DamageMarkerType
  onUpdate: (marker: DamageMarkerType) => void
  onDelete: (id: string) => void
  className?: string
}

export function DamageMarker({
  marker,
  onUpdate,
  onDelete,
  className = ''
}: DamageMarkerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    type: marker.type,
    severity: marker.severity,
    description: marker.description
  })

  const handleSave = () => {
    const classification = damageClassifier.classifyDamage(
      undefined,
      editData.description
    )

    const updatedMarker: DamageMarkerType = {
      ...marker,
      type: editData.type,
      severity: editData.severity,
      description: editData.description,
      updated_at: new Date().toISOString()
    }

    onUpdate(updatedMarker)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      type: marker.type,
      severity: marker.severity,
      description: marker.description
    })
    setIsEditing(false)
  }

  const getSeverityColor = (severity: DamageSeverity) => {
    switch (severity) {
      case DamageSeverity.MINOR:
        return 'text-yellow-600 bg-yellow-100'
      case DamageSeverity.MODERATE:
        return 'text-orange-600 bg-orange-100'
      case DamageSeverity.SEVERE:
        return 'text-red-600 bg-red-100'
      case DamageSeverity.CRITICAL:
        return 'text-red-800 bg-red-200'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getDamageTypeLabel = (type: DamageType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getSeverityLabel = (severity: DamageSeverity) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1)
  }

  if (isEditing) {
    return (
      <div className={'bg-white rounded-lg shadow-lg border-2 border-blue-500 p-4 ' + className}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-medium text-gray-900">Edit Damage Marker</h4>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Damage Type
            </label>
            <select
              value={editData.type}
              onChange={(e) => setEditData({ ...editData, type: e.target.value as DamageType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(DamageType).map((type) => (
                <option key={type} value={type}>
                  {getDamageTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              value={editData.severity}
              onChange={(e) => setEditData({ ...editData, severity: e.target.value as DamageSeverity })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(DamageSeverity).map((severity) => (
                <option key={severity} value={severity}>
                  {getSeverityLabel(severity)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the damage in detail..."
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={'bg-white rounded-lg shadow-lg border border-gray-200 p-4 ' + className}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h4 className="text-lg font-medium text-gray-900">
            {getDamageTypeLabel(marker.type)}
          </h4>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
            title="Edit marker"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(marker.id)}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
            title="Delete marker"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={'px-2 py-1 rounded-full text-sm font-medium ' + getSeverityColor(marker.severity)}
          >
            {getSeverityLabel(marker.severity)}
          </span>
        </div>

        <p className="text-gray-700 text-sm">{marker.description}</p>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>
              {marker.position.x.toFixed(2)}, {marker.position.y.toFixed(2)}, {marker.position.z.toFixed(2)}
            </span>
          </div>
          
          <div>
            {new Date(marker.created_at).toLocaleString()}
          </div>
        </div>

        {marker.measurements.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              Associated Measurements ({marker.measurements.length})
            </h5>
            <div className="space-y-1">
              {marker.measurements.map((measurement) => (
                <div key={measurement.id} className="text-sm text-gray-600">
                  {measurement.type}: {measurement.value.toFixed(2)} {measurement.unit}
                </div>
              ))}
            </div>
          </div>
        )}

        {marker.photos && marker.photos.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Camera className="h-4 w-4" />
              <span>{marker.photos.length} photo{marker.photos.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DamageMarkerListProps {
  markers: DamageMarkerType[]
  onMarkerUpdate: (marker: DamageMarkerType) => void
  onMarkerDelete: (id: string) => void
  className?: string
}

export function DamageMarkerList({
  markers,
  onMarkerUpdate,
  onMarkerDelete,
  className = ''
}: DamageMarkerListProps) {
  if (markers.length === 0) {
    return (
      <div className={'bg-white rounded-lg shadow p-6 text-center ' + className}>
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Damage Markers</h3>
        <p className="text-gray-500">
          Use the AR viewport to add damage markers to the roof
        </p>
      </div>
    )
  }

  return (
    <div className={'space-y-4 ' + className}>
      <h3 className="text-lg font-medium text-gray-900">
        Damage Markers ({markers.length})
      </h3>
      
      {markers.map((marker) => (
        <DamageMarker
          key={marker.id}
          marker={marker}
          onUpdate={onMarkerUpdate}
          onDelete={onMarkerDelete}
        />
      ))}
    </div>
  )
}
