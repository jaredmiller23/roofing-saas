# Enzy Lead Import Guide

Quick reference for importing leads from Enzy door-knocking platform.

## 📋 Quick Start

### 1. Collect Leads from Enzy
1. Login to https://app.enzy.co/sell/leads
2. Click filter button → Select "Team" → Select "Team Tri City"
3. Should show 705 total entries
4. Copy visible rows (20 at a time due to virtual scrolling)
5. Save to JSON file in `/Users/ccai/Roofing SaaS/Enzy Leads/`

### 2. Merge Multiple Batches (if needed)
```bash
npx tsx scripts/merge-enzy-batches.ts \
  "/Users/ccai/Roofing SaaS/Enzy Leads/YOUR-BATCHES.json" \
  "/Users/ccai/Roofing SaaS/Enzy Leads/Merged.json"
```

### 3. Import Leads
```bash
npx tsx scripts/import-enzy-leads.ts \
  "/Users/ccai/Roofing SaaS/Enzy Leads/Merged.json"
```

## 📊 Current Status
- **Imported**: 300 / 705 leads
- **Remaining**: 405 leads
- **Success Rate**: 100% (0 errors)
- **Match Rate**: 97.7% (matched existing Proline contacts)

## 🔧 How It Works

### Name Matching
- Parses "First Last" into separate fields
- Searches contacts by `first_name` + `last_name`
- **If found**: Updates existing contact with Enzy data
- **If not found**: Creates new contact

### Data Stored
All Enzy data goes into `custom_fields`:
- `enzy_lead_status`: "IRA Signed", "Appointment Schedule...", etc.
- `enzy_setter`: Who set the appointment
- `enzy_closer`: Who closed the deal
- `enzy_appointment`: Appointment date/time
- `enzy_team`: "Team Tri City"
- `imported_at`: Timestamp

Plus standard fields:
- `source`: "enzy"
- `type`: "lead"
- `stage`: "lead"
- Address components parsed from full address

## 📁 File Format

Expected JSON structure:
```json
{
  "totalLeads": 20,
  "leads": [
    {
      "customerName": "John Doe",
      "setter": "Lee Hunt",
      "closer": "Lee Hunt",
      "address": "123 Main St, Kingsport, TN 37660, USA",
      "appointment": "Mon, Jan 06 02:00PM",
      "team": "Team Tri City",
      "leadStatus": "IRA Signed"
    }
  ]
}
```

## ⚠️ Common Issues

### Missing Opening Brace
If you get: `SyntaxError: Unexpected non-whitespace character`
- The JSON file is missing `{` at the start
- Use `merge-enzy-batches.ts` to fix it automatically

### Multiple Batches Concatenated
If file has multiple `}{ }{ }{` patterns:
- Run `merge-enzy-batches.ts` to combine them properly

### Virtual Scrolling Limits
- Enzy only loads 20 rows at a time in browser
- Must collect multiple batches manually
- No direct export functionality available

## 🎯 Next Steps

1. **Continue collecting**: Get remaining 405 leads from Enzy
2. **Batch import**: Use same scripts, they handle duplicates
3. **Verify data**: Check contacts table for complete import
4. **Sync to knowledge base** (optional): For AI chatbot

## 📞 Support

See full documentation: `docs/SESSION_SUMMARY_2025-01-02.md`

---
Last Updated: January 2, 2025
