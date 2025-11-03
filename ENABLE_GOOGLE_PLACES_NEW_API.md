# Enable Google Places API (New)

**Issue**: "You're calling a legacy API, which is not enabled"
**Solution**: Enable the NEW Places API in Google Cloud Console

---

## 🔧 Step-by-Step Instructions

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Select Your Project
- Click the project dropdown at the top
- Select the project that has your API key

### 3. Enable Places API (New)
- Go to **APIs & Services** → **Library**
- Search for **"Places API (New)"**
- Click on it
- Click **"Enable"** button

### 4. Verify API Key Has Access
- Go to **APIs & Services** → **Credentials**
- Find your API key
- Click **Edit**
- Under **API restrictions**, make sure **"Places API (New)"** is allowed

---

## 💡 Alternative: Use Geocoding API Instead

If you don't want to enable Places API (New), we can use the Geocoding API which you likely already have enabled.

**Would you like me to:**
- **Option A**: Keep Places API (New) approach (you enable it)
- **Option B**: Switch to Geocoding API + grid search (I implement it)

**Option B is simpler** because Geocoding API is usually already enabled for Google Maps projects.

---

## 📊 Cost Comparison

| API | Cost per Request | Enabled By Default |
|-----|------------------|-------------------|
| **Places API (New)** | $0.017 | ❌ No |
| **Geocoding API** | $0.005 | ✅ Usually Yes |

**Option B would be $0.005 per address vs $0.017 + $0.005 = $0.022**

So Option B is actually CHEAPER!

---

## 🚀 Quick Decision

**I recommend Option B** (Geocoding API):
- ✅ Likely already enabled
- ✅ Cheaper ($0.005 vs $0.022 per address)
- ✅ Simpler (one API instead of two)
- ✅ Works immediately

**Shall I implement Option B?** It will take 10 minutes.
