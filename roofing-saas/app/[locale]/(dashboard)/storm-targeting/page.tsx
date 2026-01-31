/**
 * STORM TARGETING PAGE
 * The weapon that makes Proline and Enzy look obsolete
 *
 * Features:
 * - Draw polygons on map to select storm-affected areas
 * - Extract 100s of addresses in seconds
 * - Auto-geocode to full addresses
 * - Bulk import to CRM
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { GoogleMap, DrawingManager, useJsApiLoader } from '@react-google-maps/api';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Zap, Download, Users } from 'lucide-react';
import type { ExtractedAddress } from '@/lib/address-extraction/types';
import { useFeatureAccess } from '@/lib/billing/hooks';
import { FeatureGate } from '@/components/billing/FeatureGate';

// =====================================================
// TYPES
// =====================================================

interface DrawnPolygon {
  coordinates: Array<{ lat: number; lng: number }>;
}

interface ExtractionResult {
  success: boolean;
  targetingAreaId?: string;
  addresses: ExtractedAddress[];
  stats: {
    totalBuildings: number;
    residentialCount: number;
    commercialCount: number;
    areaSquareMiles: number;
    estimatedProperties: number;
    processingTimeMs: number;
  };
  error?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const GOOGLE_MAPS_LIBRARIES: ('drawing' | 'geometry' | 'places')[] = ['drawing', 'geometry'];

const DEFAULT_CENTER = {
  lat: 36.5484, // Kingsport, TN
  lng: -82.5618,
};

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '600px',
  borderRadius: '0.5rem',
};

// Map options - no google types here
const MAP_OPTIONS = {
  mapTypeControl: true,
  mapTypeControlOptions: {
    position: 3, // TOP_RIGHT
    style: 1, // HORIZONTAL_BAR
    mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
  },
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeId: 'hybrid', // Satellite with road labels overlay
  tilt: 0, // Disable 3D tilt for clearer view
};

// Drawing options - these will be created after google loads
const getDrawingManagerOptions = (): google.maps.drawing.DrawingManagerOptions => ({
  drawingMode: null,
  drawingControl: true,
  drawingControlOptions: {
    position: 2, // TOP_CENTER
    drawingModes: [
      google.maps.drawing.OverlayType.POLYGON,
      google.maps.drawing.OverlayType.RECTANGLE,
      google.maps.drawing.OverlayType.CIRCLE,
    ],
  },
  polygonOptions: {
    fillColor: '#FF6B6B',
    fillOpacity: 0.2,
    strokeColor: '#FF0000',
    strokeWeight: 2,
    editable: true,
    draggable: true,
  },
  rectangleOptions: {
    fillColor: '#FF6B6B',
    fillOpacity: 0.2,
    strokeColor: '#FF0000',
    strokeWeight: 2,
    editable: true,
    draggable: true,
  },
  circleOptions: {
    fillColor: '#FF6B6B',
    fillOpacity: 0.2,
    strokeColor: '#FF0000',
    strokeWeight: 2,
    editable: true,
    draggable: true,
  },
});

// =====================================================
// COMPONENT
// =====================================================

export default function StormTargetingPage() {
  // Feature access
  const { features, isLoading: featuresLoading } = useFeatureAccess();

  // Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // State
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<DrawnPolygon | null>(null);
  const [currentOverlay, setCurrentOverlay] = useState<google.maps.drawing.OverlayCompleteEvent['overlay'] | null>(null);
  const [areaName, setAreaName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  // =====================================================
  // MAP CALLBACKS
  // =====================================================

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // =====================================================
  // DRAWING CALLBACKS
  // =====================================================

  const onOverlayComplete = useCallback(
    (event: google.maps.drawing.OverlayCompleteEvent) => {
      // Clear previous overlay
      if (currentOverlay) {
        currentOverlay.setMap(null);
      }

      const overlay = event.overlay;
      setCurrentOverlay(overlay);

      // Extract polygon coordinates
      let coordinates: Array<{ lat: number; lng: number }> = [];

      if (event.type === google.maps.drawing.OverlayType.POLYGON) {
        const polygon = overlay as google.maps.Polygon;
        const path = polygon.getPath();
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i);
          coordinates.push({ lat: point.lat(), lng: point.lng() });
        }
      } else if (event.type === google.maps.drawing.OverlayType.RECTANGLE) {
        const rectangle = overlay as google.maps.Rectangle;
        const bounds = rectangle.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          coordinates = [
            { lat: ne.lat(), lng: sw.lng() }, // NW
            { lat: ne.lat(), lng: ne.lng() }, // NE
            { lat: sw.lat(), lng: ne.lng() }, // SE
            { lat: sw.lat(), lng: sw.lng() }, // SW
          ];
        }
      } else if (event.type === google.maps.drawing.OverlayType.CIRCLE) {
        const circle = overlay as google.maps.Circle;
        const center = circle.getCenter();
        const radius = circle.getRadius();

        // Convert circle to polygon (approximate with 32 points)
        if (center) {
          for (let i = 0; i < 32; i++) {
            const angle = (i / 32) * 2 * Math.PI;
            const lat = center.lat() + (radius / 111320) * Math.cos(angle); // 1 degree ≈ 111km
            const lng = center.lng() + (radius / (111320 * Math.cos(center.lat() * (Math.PI / 180)))) * Math.sin(angle);
            coordinates.push({ lat, lng });
          }
        }
      }

      setDrawnPolygon({ coordinates });
      setError(null);

      // Disable drawing mode after drawing
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
      }
    },
    [currentOverlay]
  );

  // Feature gate check - must be after all hooks
  if (!featuresLoading && !features.stormData) {
    return (
      <div className="container mx-auto p-6">
        <FeatureGate
          allowed={false}
          featureName="Lead Gen"
          requiredPlan="Professional"
        >
          <div />
        </FeatureGate>
      </div>
    );
  }

  // =====================================================
  // ZIP CODE TO POLYGON
  // =====================================================

  const loadZipCodeBoundary = async () => {
    if (!zipCode.trim()) {
      setError('Please enter a ZIP code');
      return;
    }

    setIsLoadingZip(true);
    setError(null);

    try {
      const geocoder = new google.maps.Geocoder();

      // Geocode the ZIP code
      const result = await geocoder.geocode({
        address: zipCode + ', TN, USA', // Add TN to prioritize Tennessee
        componentRestrictions: {
          country: 'US',
        },
      });

      if (!result.results || result.results.length === 0) {
        throw new Error('ZIP code not found');
      }

      const place = result.results[0];

      // Get the viewport bounds (rectangular area)
      const bounds = place.geometry.viewport;
      if (!bounds) {
        throw new Error('Could not determine ZIP code boundaries');
      }

      // Convert bounds to polygon (rectangle)
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const coordinates = [
        { lat: ne.lat(), lng: sw.lng() }, // NW
        { lat: ne.lat(), lng: ne.lng() }, // NE
        { lat: sw.lat(), lng: ne.lng() }, // SE
        { lat: sw.lat(), lng: sw.lng() }, // SW
      ];

      // Clear any existing overlay
      if (currentOverlay) {
        currentOverlay.setMap(null);
      }

      // Create and draw polygon on map
      const polygon = new google.maps.Polygon({
        paths: coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
        fillColor: '#FF6B6B',
        fillOpacity: 0.2,
        strokeColor: '#FF0000',
        strokeWeight: 2,
        editable: true,
        draggable: true,
        map: map,
      });

      setCurrentOverlay(polygon as google.maps.drawing.OverlayCompleteEvent['overlay']);
      setDrawnPolygon({ coordinates });

      // Center map on ZIP code
      if (map) {
        map.fitBounds(bounds);
      }

      // Auto-populate area name
      const formattedAddress = place.formatted_address || '';
      const zipMatch = formattedAddress.match(/\d{5}/);
      if (zipMatch) {
        setAreaName(`ZIP ${zipMatch[0]}`);
      }

      setError(null);
    } catch (err) {
      console.error('ZIP code loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ZIP code boundary');
    } finally {
      setIsLoadingZip(false);
    }
  };

  // =====================================================
  // ADDRESS EXTRACTION
  // =====================================================

  const extractAddresses = async () => {
    if (!drawnPolygon || drawnPolygon.coordinates.length < 3) {
      setError('Please draw an area on the map first');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractionResult(null);

    try {
      const data = await apiFetch<ExtractionResult>('/api/storm-targeting/extract-addresses', {
        method: 'POST',
        body: {
          polygon: drawnPolygon,
          targetingAreaName: areaName || undefined,
        },
      });

      // Show error message if present (even if success=true)
      if (data.error) {
        setError(data.error);
      }

      setExtractionResult(data);
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsExtracting(false);
    }
  };

  // =====================================================
  // CLEAR & RESET
  // =====================================================

  const clearDrawing = () => {
    if (currentOverlay) {
      currentOverlay.setMap(null);
      setCurrentOverlay(null);
    }
    setDrawnPolygon(null);
    setExtractionResult(null);
    setError(null);
  };

  // =====================================================
  // EXPORT TO CSV
  // =====================================================

  const exportToCSV = () => {
    if (!extractionResult || extractionResult.addresses.length === 0) {
      return;
    }

    const headers = ['Address', 'City', 'State', 'Zip', 'Latitude', 'Longitude', 'Property Type', 'Building Type'];
    const rows = extractionResult.addresses.map((addr) => [
      addr.fullAddress || '',
      addr.city || '',
      addr.state || '',
      addr.zipCode || '',
      addr.lat.toString(),
      addr.lng.toString(),
      addr.osmPropertyType || '',
      addr.osmBuildingType || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `addresses-${areaName || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // =====================================================
  // BULK IMPORT TO CONTACTS
  // =====================================================

  const bulkImportToContacts = async () => {
    if (!extractionResult || !extractionResult.targetingAreaId) {
      setError('No extraction result to import');
      return;
    }

    // Confirmation warning
    const confirmed = confirm(
      `⚠️ ADDRESS-ONLY IMPORT\n\n` +
      `You're about to import ${extractionResult.addresses.length} addresses as leads.\n\n` +
      `These will NOT have:\n` +
      `• Owner names\n` +
      `• Phone numbers\n` +
      `• Email addresses\n\n` +
      `They will be tagged as "needs-enrichment" so you can add owner data later.\n\n` +
      `Continue?`
    );

    if (!confirmed) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const data = await apiFetch<{ imported: number }>('/api/storm-targeting/bulk-import-contacts', {
        method: 'POST',
        body: {
          targetingAreaId: extractionResult.targetingAreaId,
        },
      });

      // Success! Show message and clear results
      alert(
        `✅ Successfully imported ${data.imported} address-only leads!\n\n` +
        `They're tagged as "needs-enrichment" in your Contacts.\n` +
        `Next step: Add owner names, phones, and emails.`
      );

      // Clear the extraction result since it's been imported
      setExtractionResult(null);
      setDrawnPolygon(null);
      if (currentOverlay) {
        currentOverlay.setMap(null);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import contacts');
    } finally {
      setIsImporting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (loadError) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load Google Maps. Please check your API key configuration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Storm Targeting</h1>
        <p className="text-muted-foreground mt-2">
          Draw an area on the map to extract addresses in seconds. Welcome to the future.
        </p>
      </div>

      {/* Map */}
      <Card className="p-0 overflow-hidden">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={DEFAULT_CENTER}
          zoom={12}
          options={MAP_OPTIONS}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {isLoaded && (
            <DrawingManager
              onLoad={(dm) => (drawingManagerRef.current = dm)}
              onOverlayComplete={onOverlayComplete}
              options={getDrawingManagerOptions()}
            />
          )}
        </GoogleMap>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Area Info */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Area Selection</h3>

            <div className="space-y-4">
              {/* ZIP Code Input */}
              <div>
                <Label htmlFor="zip-code">Load ZIP Code Boundary</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="zip-code"
                    placeholder="e.g., 37660"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        loadZipCodeBoundary();
                      }
                    }}
                    disabled={isLoadingZip || isExtracting}
                    maxLength={5}
                  />
                  <Button
                    onClick={loadZipCodeBoundary}
                    disabled={isLoadingZip || isExtracting}
                    variant="secondary"
                  >
                    {isLoadingZip ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Load'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generate area from ZIP code
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or draw manually
                  </span>
                </div>
              </div>

              {/* Area Name */}
              <div>
                <Label htmlFor="area-name">Area Name</Label>
                <Input
                  id="area-name"
                  placeholder="e.g., ZIP 37660 or Kingsport North"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  disabled={isExtracting}
                />
              </div>

              {drawnPolygon && (
                <div className="text-sm text-muted-foreground">
                  <p>Polygon points: {drawnPolygon.coordinates.length}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={extractAddresses}
              disabled={!drawnPolygon || isExtracting}
              className="flex-1"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Extract Addresses
                </>
              )}
            </Button>

            <Button
              onClick={clearDrawing}
              variant="outline"
              disabled={isExtracting}
            >
              Clear
            </Button>
          </div>
        </Card>

        {/* Right: Results */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {extractionResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {extractionResult.stats.residentialCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Residential</div>
                </div>

                <div className="text-center p-4 bg-secondary/10 rounded-lg">
                  <div className="text-3xl font-bold">
                    {extractionResult.stats.totalBuildings}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Buildings</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-xl font-semibold">
                    {extractionResult.stats.areaSquareMiles.toFixed(2)} mi²
                  </div>
                  <div className="text-sm text-muted-foreground">Area</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-xl font-semibold">
                    {(extractionResult.stats.processingTimeMs / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-muted-foreground">Processing Time</div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV ({extractionResult.addresses.length} addresses)
                </Button>

                <Button
                  onClick={bulkImportToContacts}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing to Contacts...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Import to Contacts ({extractionResult.addresses.length} addresses)
                    </>
                  )}
                </Button>
              </div>

              <Alert>
                <MapPin className="w-4 h-4" />
                <AlertDescription>
                  <strong>Address extraction complete!</strong>
                  <br />
                  {extractionResult.addresses.length} addresses extracted and geocoded.
                  <br />
                  <br />
                  <strong>Options:</strong>
                  <br />
                  • Export to CSV to get owner data (county records, skip tracing, etc.)
                  <br />
                  • Import as address-only leads (you&apos;ll add owner data later)
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!extractionResult && !error && (
            <div className="text-center text-muted-foreground py-12">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Draw an area on the map to extract addresses</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
