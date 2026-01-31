/**
 * STORM LEADS MANAGEMENT PAGE
 * View, enrich, and import extracted addresses
 *
 * Workflow:
 * 1. View extracted addresses from targeting areas
 * 2. Upload CSV with owner data (from any source: county records, skip tracing, etc.)
 * 3. Match and enrich addresses
 * 4. Import enriched contacts to CRM
 */

'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Upload,
  Users,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Download
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

interface ExtractedAddress {
  id: string;
  targeting_area_id: string;
  full_address: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  is_enriched: boolean;
  is_selected: boolean;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  enrichment_source?: string;
  enriched_at?: string;
}

interface TargetingArea {
  id: string;
  name: string;
  address_count: number;
  area_sq_miles: number;
  status: string;
  created_at: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function StormLeadsPage() {
  const [targetingAreas, setTargetingAreas] = useState<TargetingArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<ExtractedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterEnriched, setFilterEnriched] = useState<'all' | 'enriched' | 'not-enriched'>('all');

  // =====================================================
  // LOAD TARGETING AREAS
  // =====================================================

  useEffect(() => {
    loadTargetingAreas();
  }, []);

  const loadTargetingAreas = async () => {
    try {
      const data = await apiFetch<{ areas: TargetingArea[] }>('/api/storm-targeting/areas');
      setTargetingAreas(data.areas || []);
    } catch (err) {
      console.error('Failed to load targeting areas:', err);
    }
  };

  // =====================================================
  // LOAD ADDRESSES FOR AREA
  // =====================================================

  const loadAddresses = async (areaId: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedAreaId(areaId);

    try {
      const data = await apiFetch<{ addresses: ExtractedAddress[] }>(`/api/storm-targeting/addresses?areaId=${areaId}`);
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error('Failed to load addresses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // CSV UPLOAD
  // =====================================================

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAreaId) return;

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetingAreaId', selectedAreaId);

      const response = await fetch('/api/storm-targeting/enrich-from-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process CSV');
      }

      setSuccessMessage(`✅ Enriched ${data.enrichedCount} addresses from CSV!`);

      // Reload addresses to show enrichment
      await loadAddresses(selectedAreaId);
    } catch (err) {
      console.error('CSV upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // =====================================================
  // BULK IMPORT ENRICHED CONTACTS
  // =====================================================

  const bulkImportEnriched = async () => {
    if (!selectedAreaId) return;

    const enrichedCount = addresses.filter(a => a.is_enriched && a.is_selected).length;

    if (enrichedCount === 0) {
      alert('No enriched addresses selected to import.');
      return;
    }

    const confirmed = confirm(
      `Import ${enrichedCount} enriched contacts to CRM?\n\n` +
      `These addresses have owner information and are ready for outreach.`
    );

    if (!confirmed) return;

    setIsImporting(true);
    setError(null);

    try {
      const data = await apiFetch<{ imported: number }>('/api/storm-targeting/import-enriched', {
        method: 'POST',
        body: { targetingAreaId: selectedAreaId },
      });

      alert(`Successfully imported ${data.imported} enriched contacts!`);

      // Reload to show updated status
      await loadAddresses(selectedAreaId);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import contacts');
    } finally {
      setIsImporting(false);
    }
  };

  // =====================================================
  // DOWNLOAD CSV TEMPLATE
  // =====================================================

  const downloadTemplate = () => {
    const headers = ['Address', 'Owner Name', 'Owner Phone', 'Owner Email', 'Property Value', 'Year Built'];
    const csvContent = headers.join(',') + '\n' +
      '# Fill in owner data from any source (county records, skip tracing services, etc.)';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enrichment-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // =====================================================
  // FILTERED ADDRESSES
  // =====================================================

  const filteredAddresses = addresses.filter(addr => {
    if (filterEnriched === 'enriched') return addr.is_enriched;
    if (filterEnriched === 'not-enriched') return !addr.is_enriched;
    return true;
  });

  const stats = {
    total: addresses.length,
    enriched: addresses.filter(a => a.is_enriched).length,
    notEnriched: addresses.filter(a => !a.is_enriched).length,
    selected: addresses.filter(a => a.is_selected && a.is_enriched).length,
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Storm Leads Management</h1>
        <p className="text-muted-foreground">
          Enrich extracted addresses with owner data, then import to CRM
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle2 className="w-4 h-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Targeting Areas List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Targeting Areas</h2>
          <div className="space-y-2">
            {targetingAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No targeting areas yet. Extract addresses first.
              </p>
            ) : (
              targetingAreas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => loadAddresses(area.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedAreaId === area.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{area.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {area.address_count} addresses • {area.area_sq_miles.toFixed(1)} mi²
                  </div>
                  <Badge variant={area.status === 'imported' ? 'default' : 'secondary'} className="mt-1">
                    {area.status}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* RIGHT: Address List & Actions */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedAreaId ? (
            <Card className="p-12 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Select a targeting area to view addresses
              </p>
            </Card>
          ) : (
            <>
              {/* Stats & Actions */}
              <Card className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.enriched}</div>
                    <div className="text-sm text-muted-foreground">Enriched</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.notEnriched}</div>
                    <div className="text-sm text-muted-foreground">Need Data</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.selected}</div>
                    <div className="text-sm text-muted-foreground">Selected</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>

                  <label htmlFor="csv-upload">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      asChild
                    >
                      <span>
                        {isUploading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" />Upload Enrichment CSV</>
                        )}
                      </span>
                    </Button>
                  </label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />

                  <Button
                    onClick={bulkImportEnriched}
                    disabled={isImporting || stats.selected === 0}
                    size="sm"
                  >
                    {isImporting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                    ) : (
                      <><Users className="w-4 h-4 mr-2" />Import {stats.selected} Enriched Contacts</>
                    )}
                  </Button>

                  <div className="ml-auto flex gap-2">
                    <Button
                      variant={filterEnriched === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterEnriched('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterEnriched === 'enriched' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterEnriched('enriched')}
                    >
                      Enriched
                    </Button>
                    <Button
                      variant={filterEnriched === 'not-enriched' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterEnriched('not-enriched')}
                    >
                      Need Data
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Address List */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Addresses</h3>

                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAddresses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No addresses match the current filter
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{addr.full_address || addr.street_address}</div>
                            <div className="text-sm text-muted-foreground">
                              {addr.city}, {addr.state} {addr.zip_code}
                            </div>

                            {addr.is_enriched && (
                              <div className="mt-2 space-y-1">
                                {addr.owner_name && (
                                  <div className="text-sm">
                                    <span className="font-medium">Owner:</span> {addr.owner_name}
                                  </div>
                                )}
                                {addr.owner_phone && (
                                  <div className="text-sm">
                                    <span className="font-medium">Phone:</span> {addr.owner_phone}
                                  </div>
                                )}
                                {addr.owner_email && (
                                  <div className="text-sm">
                                    <span className="font-medium">Email:</span> {addr.owner_email}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {addr.is_enriched ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Enriched
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Needs Data
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
