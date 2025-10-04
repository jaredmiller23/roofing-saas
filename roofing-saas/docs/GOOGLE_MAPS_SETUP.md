# Google Maps Platform Setup Guide

This guide walks through setting up Google Maps Platform for the Roofing SaaS application.

## Features Enabled by Google Maps

✅ **Geocoding**: Convert addresses to coordinates and vice versa
✅ **Route Optimization**: Plan efficient canvassing routes
✅ **Distance Calculations**: Calculate travel distance and time
✅ **Address Validation**: Verify addresses before saving
✅ **Batch Geocoding**: Process multiple addresses at once

## Cost Estimation

**Pricing (as of 2024)**:
- **Geocoding API**: $5 per 1,000 requests
- **Directions API**: $5 per 1,000 requests (with waypoints: $10)
- **Distance Matrix API**: $5 per 1,000 elements

**Expected Usage** (50 field reps):
- Geocoding: ~500 requests/day = ~$75/month
- Route optimization: ~100 requests/day = ~$50/month
- **Total estimated cost**: ~$125/month

**Free tier**: $200 credit/month (covers expected usage)

## Setup Instructions

### 1. Create Google Cloud Platform Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "Roofing SaaS Maps"
4. Click "Create"

### 2. Enable Required APIs

1. Go to "APIs & Services" → "Library"
2. Enable the following APIs:
   - ✅ **Maps JavaScript API** (for map display)
   - ✅ **Geocoding API** (address → coordinates)
   - ✅ **Directions API** (route optimization)
   - ✅ **Distance Matrix API** (distance calculations)
   - ✅ **Places API** (optional - for address autocomplete)

### 3. Create API Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key (will be something like `AIzaSyD...`)

### 4. Restrict API Key (IMPORTANT for security)

1. Click on the newly created API key
2. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add referrers:
     ```
     http://localhost:3000/*
     https://yourapp.vercel.app/*
     https://*.vercel.app/*
     ```

3. Under "API restrictions":
   - Select "Restrict key"
   - Select only the APIs you enabled:
     - Geocoding API
     - Directions API
     - Distance Matrix API
     - Maps JavaScript API
     - Places API (if using)

4. Click "Save"

### 5. Set Up Billing

1. Go to "Billing" in the menu
2. Link a billing account (required even for free tier)
3. Set up budget alerts:
   - Budget: $200/month
   - Alert thresholds: 50%, 90%, 100%

### 6. Add API Key to Environment

Add to `.env.local`:

```bash
# Google Maps Platform
GOOGLE_MAPS_API_KEY=AIzaSyD...your-key-here...
```

⚠️ **NEVER commit this to git!** The `.env.local` file is already in `.gitignore`.

### 7. Verify Setup

Test the API with curl:

```bash
# Geocoding test
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY"

# Should return JSON with coordinates
```

## Usage in Application

### Geocoding an Address

```typescript
// Frontend - fetch from API
const response = await fetch('/api/maps/geocode?address=123 Main St, Nashville, TN')
const result = await response.json()
console.log(result) // { latitude, longitude, formatted_address, ... }
```

```typescript
// Backend - use service directly
import { geocodeAddress } from '@/lib/maps/geocoding'

const result = await geocodeAddress('123 Main St, Nashville, TN')
// { latitude, longitude, formatted_address, address_components, place_id }
```

### Reverse Geocoding (Coordinates → Address)

```typescript
const response = await fetch('/api/maps/geocode?lat=36.1627&lng=-86.7816')
const result = await response.json()
// { formatted_address, street_address, city, state, postal_code, ... }
```

### Batch Geocoding

```typescript
const addresses = [
  '123 Main St, Nashville, TN',
  '456 Oak Ave, Nashville, TN',
  '789 Elm St, Nashville, TN'
]

const response = await fetch(`/api/maps/geocode?batch=${JSON.stringify(addresses)}`)
const { results } = await response.json()
// Array of geocode results
```

### Route Optimization

```typescript
const response = await fetch('/api/maps/route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start: {
      id: 'office',
      latitude: 36.1627,
      longitude: -86.7816,
      address: 'Office',
    },
    waypoints: [
      { id: '1', latitude: 36.1500, longitude: -86.7900, address: '123 Main St' },
      { id: '2', latitude: 36.1700, longitude: -86.7700, address: '456 Oak Ave' },
      { id: '3', latitude: 36.1600, longitude: -86.7850, address: '789 Elm St' },
    ],
    return_to_start: true
  })
})

const optimized = await response.json()
// {
//   waypoints: [...], // Optimized order
//   total_distance_meters: 15000,
//   total_duration_minutes: 35,
//   optimized_order: [1, 0, 2] // New sequence
// }
```

### Nearest Neighbor Route (No API Key Required)

Uses local calculation (Haversine formula) - good fallback:

```typescript
const response = await fetch(
  `/api/maps/route?action=nearest_neighbor&start=${JSON.stringify(start)}&waypoints=${JSON.stringify(waypoints)}`
)
```

## Monitoring & Cost Control

### View Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Dashboard"
4. Click on each API to see usage graphs

### Cost Optimization Tips

1. **Cache Geocoding Results**: Store coordinates in database after first geocode
2. **Batch Requests**: Use batch geocoding when possible
3. **Use Fallback Algorithm**: Nearest neighbor route optimization doesn't use API
4. **Client-Side Caching**: Cache results in localStorage for repeat queries
5. **Rate Limiting**: Implement rate limits to prevent abuse

### Budget Alerts

Set up alerts in Google Cloud:
1. Go to "Billing" → "Budgets & alerts"
2. Create budget: $200/month
3. Set alerts at: 50%, 90%, 100%
4. Add email notifications

## Troubleshooting

### API Key Not Working

1. Check API key restrictions (referrers)
2. Verify APIs are enabled
3. Check billing is set up
4. Wait 5 minutes after creating key (propagation delay)

### Geocoding Returns No Results

1. Verify address format is correct
2. Try with simpler address (just city, state)
3. Check API quota hasn't been exceeded
4. View error in Google Cloud Console logs

### High Costs

1. Check for unexpected usage spikes in dashboard
2. Implement caching if not already done
3. Use nearest neighbor fallback for route optimization
4. Consider switching to Mapbox (cheaper for high volume)

## Alternative: Mapbox

If costs are too high, consider Mapbox:
- **Pricing**: 100,000 requests free/month
- **Geocoding**: $0.50 per 1,000 after free tier
- **Directions**: $0.50 per 1,000 after free tier
- **Much cheaper** for high-volume applications

## Support

- **Google Maps Documentation**: https://developers.google.com/maps/documentation
- **Pricing Calculator**: https://mapsplatform.google.com/pricing/
- **API Status**: https://status.cloud.google.com/

---

## Next Steps

After setup:
1. ✅ Add `GOOGLE_MAPS_API_KEY` to `.env.local`
2. ✅ Restart the dev server: `npm run dev`
3. ✅ Test geocoding: Visit `/api/maps/geocode?address=Nashville,TN`
4. ✅ Test route optimization in territory map
5. ✅ Monitor usage in Google Cloud Console
6. ✅ Implement caching strategy for production

**Setup Complete!** 🎉 Your mapping services are ready to use.
