# Tracerfy Quick Reference Card

**Last Updated**: November 3, 2025

---

## 🎯 What Is Tracerfy?

Skip tracing service that finds owner contact information when you have their name + address.

**Perfect for**: Door-knock follow-ups
**Cost**: $0.009 per lookup
**Processing Time**: 1-5 minutes

---

## ✅ Requirements

**MUST HAVE**:
- first_name
- last_name
- street_address (or full_address)
- city
- state

**Example**:
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "street_address": "123 Main St",
  "city": "Nashville",
  "state": "TN"
}
```

---

## 🚀 How to Use

### API Endpoint
```
POST /api/storm-targeting/enrich-properties
```

### Request Body
```json
{
  "addresses": [
    {
      "first_name": "John",
      "last_name": "Smith",
      "street_address": "123 Main St",
      "city": "Nashville",
      "state": "TN"
    }
  ],
  "provider": "tracerfy"
}
```

### Response
```json
{
  "success": true,
  "job_id": "uuid",
  "status": "processing"
}
```

### Check Status
```
GET /api/storm-targeting/enrich-properties?jobId={uuid}
```

---

## 📊 What You Get Back

- **Primary Phone**: Best phone number
- **Additional Phones**: Up to 5 mobiles + 3 landlines (ranked)
- **Emails**: Up to 5 emails (ranked)
- **Quality Score**: 0-100
- **Mailing Address**: If different from property address

---

## 💰 Pricing

| Addresses | Cost |
|-----------|------|
| 10 | $0.09 |
| 50 | $0.45 |
| 100 | $0.90 |
| 500 | $4.50 |
| 1000 | $9.00 |

**Cache**: 6 months (free repeat lookups)

---

## ⚠️ When NOT to Use

❌ **Storm Targeting** - Only have addresses, no owner names → Use DealMachine or PropertyRadar instead

❌ **Initial Lead Gen** - Starting with geographic area only → Need different provider

---

## 🔧 Troubleshooting

### Error: "Tracerfy requires owner names"
**Fix**: Add first_name and last_name to every address

### Error: "Tracerfy API key not configured"
**Fix**: Check TRACERFY_API_KEY in .env.local

### Error: "No data found"
**Note**: Still charged even if no data found (valid address, just no contact info available)

---

## 📚 Full Documentation

See `/TRACERFY_INTEGRATION_GUIDE.md` for:
- Complete API documentation
- Testing instructions
- Quality scoring details
- Cost management strategies
- Debugging guide

---

## 🎯 Use Case Example

**Scenario**: Rep knocks door at 123 Main St, Nashville, TN

**Homeowner**: "I'm John Smith"

**Rep enters into system**:
- first_name: John
- last_name: Smith
- address: 123 Main St
- city: Nashville
- state: TN

**System returns** (1-5 minutes):
- Primary phone: (615) 555-0123
- Mobile 2: (615) 555-0456
- Email 1: john.smith@gmail.com
- Email 2: j.smith@work.com
- Quality score: 85/100

**Rep can now**: Immediately call/text to schedule appointment

---

**Status**: ✅ Configured and Ready
**API Key**: Already set in .env.local
**Server**: Running on http://localhost:3000
