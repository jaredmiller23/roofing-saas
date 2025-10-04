# ElevenLabs Agent Setup Guide
## Complete Step-by-Step Instructions for Roofing CRM Integration

**Last Updated:** October 4, 2025
**Status:** Implementation Complete - Needs Agent Configuration
**Cost Savings:** 73% reduction ($0.30/min → $0.08/min)

---

## 📋 Prerequisites

- [x] ElevenLabs account (sign up at https://elevenlabs.io)
- [x] ElevenLabs API key already in `.env.local`
- [x] Backend integration complete
- [x] Provider implementation complete
- [ ] Agent configuration (this guide)

---

## 🚀 Step 1: Create Your ElevenLabs Account (If Needed)

1. **Go to:** https://elevenlabs.io
2. **Click:** "Sign Up" or "Get Started"
3. **Choose Plan:**
   - **Free Tier:** 15 minutes included (good for testing)
   - **Paid Plans:** $0-$1,320/month based on usage
   - **Billing:** Per-minute usage (reduced rates for extended conversations)

4. **Verify Email** and complete account setup

---

## 🎙️ Step 2: Create Your Conversational AI Agent

### 2.1 Access the Agent Dashboard

1. **Go to:** https://elevenlabs.io/app/conversational-ai
2. **Click:** "Create new agent" or "+ New Agent"
3. **Select Template:** Choose "Blank template" for custom configuration

### 2.2 Configure Basic Settings

#### **First Message**
Set what the agent says when starting a conversation:
```
Hello! I'm your AI roofing assistant. I can help you create contacts, log door knocks, search for customer information, and add notes. How can I assist you today?
```

#### **Agent Name**
```
Roofing CRM Assistant
```

#### **Description** (Internal reference)
```
AI voice assistant for roofing field operations - creates contacts, logs knocks, manages CRM data
```

---

## 🧠 Step 3: Configure the System Prompt

This is **critical** - it defines your agent's personality and expertise.

### **Copy and paste this complete system prompt:**

```
You are a helpful AI assistant for a roofing field team with full conversation context awareness.

**ROOFING INDUSTRY EXPERTISE:**

You understand roofing terminology:
- Roof Types: Shingle (3-tab, architectural, luxury), metal (standing seam, corrugated), tile (clay, concrete), flat/low-slope, TPO, EPDM, modified bitumen
- Components: Ridge vent, soffit, fascia, drip edge, flashing (valley, step, counter), underlayment (felt, synthetic), ice & water shield, decking/sheathing
- Materials: Asphalt shingles (GAF, Owens Corning, CertainTeed), copper, aluminum, galvanized steel
- Issues: Storm damage (hail, wind), leaks, ice dams, ventilation problems, wear & tear
- Installation: Tear-off, overlay, new construction, repairs, maintenance
- Safety: OSHA compliance, fall protection, job site safety
- Measurements: Square (100 sq ft), pitch/slope (e.g., 6/12), linear feet, bundles

**COMMON SCENARIOS:**
- Storm damage inspections: Note hail size, wind damage, insurance claim potential
- Leak investigations: Check flashing, penetrations, valley issues
- Maintenance: Gutter cleaning, shingle replacement, caulking
- Estimates: Measure square footage, note pitch, accessibility, materials needed

**CRM CAPABILITIES:**
You can help users:
1. Create new contacts (homeowners, property managers)
2. Search for existing contacts
3. Add notes to contacts or projects
4. Log door knocks with dispositions
5. Update contact stages in the sales pipeline

**PERSONALITY:**
- Professional but friendly
- Concise and efficient (field workers are busy)
- Proactive in suggesting relevant actions
- Patient with outdoor/noisy environments
- Use industry terminology naturally

**CONVERSATION FLOW:**
1. Listen for user intent
2. Confirm understanding before taking action
3. Execute the appropriate function
4. Provide clear feedback on what was done
5. Ask if there's anything else needed

**EXAMPLES:**

User: "I just talked to John Smith at 123 Main Street, he's interested in a roof replacement"
You: "I'll create a contact for John Smith at 123 Main Street with interested status. One moment... Done! I've added John Smith as a new contact marked as interested. Would you like me to log this as a door knock as well?"

User: "Log a knock at 456 Oak Ave, no answer"
You: "Logging door knock at 456 Oak Avenue with 'no answer' disposition... Complete! Knock logged. Should I schedule a callback?"

User: "Search for contacts on Maple Street"
You: "Searching for contacts on Maple Street... I found 3 contacts: Sarah Johnson (#1), Mike Brown (#2), and Lisa Davis (#3). Which one would you like to know more about?"
```

---

## 🛠️ Step 4: Configure Client Tools (CRITICAL)

Client tools allow the agent to execute CRM functions in the browser.

### 4.1 Access Tools Configuration

1. In your agent settings, find **"Tools"** or **"Client Tools"** section
2. Click **"Add Client Tool"** or **"+ New Tool"**

### 4.2 Add Each Tool (Do this for ALL 5 tools)

**Tool names and parameters are CASE-SENSITIVE and must match exactly!**

---

#### **Tool 1: create_contact**

**Tool Name:** `create_contact`
**Description:**
```
Create a new contact in the CRM. Use this when the user mentions meeting someone new, getting a lead, or wants to add a contact to the system.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "first_name": {
      "type": "string",
      "description": "Contact's first name"
    },
    "last_name": {
      "type": "string",
      "description": "Contact's last name"
    },
    "phone": {
      "type": "string",
      "description": "Contact's phone number"
    },
    "email": {
      "type": "string",
      "description": "Contact's email address (optional)"
    },
    "address": {
      "type": "string",
      "description": "Contact's street address (optional)"
    },
    "city": {
      "type": "string",
      "description": "City (optional)"
    },
    "state": {
      "type": "string",
      "description": "State abbreviation, e.g., TN (optional)"
    },
    "zip": {
      "type": "string",
      "description": "ZIP code (optional)"
    },
    "source": {
      "type": "string",
      "description": "Lead source: door_knock, referral, website, phone, other (optional)"
    },
    "stage": {
      "type": "string",
      "description": "Pipeline stage: lead, contacted, qualified, proposal, negotiation, won, lost (optional, defaults to 'lead')"
    }
  },
  "required": ["first_name", "last_name"]
}
```

**Wait for Response:** ✅ **ENABLE** (agent needs to know if contact was created)

---

#### **Tool 2: search_contact**

**Tool Name:** `search_contact`
**Description:**
```
Search for existing contacts by name, phone, address, or other criteria. Use this when the user asks to find someone or look up contact information.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search term - can be name, phone, address, or any text to search for"
    }
  },
  "required": ["query"]
}
```

**Wait for Response:** ✅ **ENABLE** (agent needs the search results)

---

#### **Tool 3: add_note**

**Tool Name:** `add_note`
**Description:**
```
Add a note or activity to a contact or project. Use this when the user wants to log information, record a conversation, or document something about a contact.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "contact_id": {
      "type": "string",
      "description": "ID of the contact to add note to (optional if project_id provided)"
    },
    "project_id": {
      "type": "string",
      "description": "ID of the project to add note to (optional if contact_id provided)"
    },
    "note": {
      "type": "string",
      "description": "The note content to add"
    },
    "activity_type": {
      "type": "string",
      "description": "Type of activity: call, email, meeting, site_visit, note, other (optional, defaults to 'note')"
    }
  },
  "required": ["note"]
}
```

**Wait for Response:** ✅ **ENABLE** (agent needs confirmation)

---

#### **Tool 4: log_knock**

**Tool Name:** `log_knock`
**Description:**
```
Log a door knock activity with address and disposition. Use this when field workers report knocking on a door, whether they talked to someone or not.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "address": {
      "type": "string",
      "description": "Street address where the knock occurred"
    },
    "city": {
      "type": "string",
      "description": "City (optional)"
    },
    "state": {
      "type": "string",
      "description": "State (optional)"
    },
    "zip": {
      "type": "string",
      "description": "ZIP code (optional)"
    },
    "disposition": {
      "type": "string",
      "description": "Knock outcome: not_home, interested, not_interested, appointment, callback, already_customer, do_not_contact"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes about the knock (optional)"
    }
  },
  "required": ["address", "disposition"]
}
```

**Wait for Response:** ✅ **ENABLE** (agent needs to know if knock was logged)

---

#### **Tool 5: update_contact_stage**

**Tool Name:** `update_contact_stage`
**Description:**
```
Update a contact's stage in the sales pipeline. Use when a contact moves forward or backward in the sales process.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "contact_id": {
      "type": "string",
      "description": "ID of the contact to update"
    },
    "stage": {
      "type": "string",
      "description": "New pipeline stage: lead, contacted, qualified, proposal, negotiation, won, lost"
    }
  },
  "required": ["contact_id", "stage"]
}
```

**Wait for Response:** ✅ **ENABLE** (agent needs update confirmation)

---

### 4.3 Tool Configuration Best Practices

✅ **DO:**
- Use exact tool names (case-sensitive)
- Enable "Wait for response" for all tools
- Include detailed descriptions
- Specify all parameters clearly

❌ **DON'T:**
- Use abbreviations in tool names
- Forget to enable "Wait for response"
- Use generic descriptions
- Skip required parameters

---

## 🎨 Step 5: Select Voice

1. **In Agent Settings**, find **"Voice"** section
2. **Choose a voice** from the ElevenLabs library
3. **Recommendations for field use:**
   - Clear, professional voices (e.g., "Rachel", "Adam", "Sam")
   - Avoid very deep or very high-pitched voices (outdoor noise)
   - Test in noisy environments

4. **Click "Test AI Agent"** to hear the voice

---

## 🆔 Step 6: Get Your Agent ID

### Method 1: From Dashboard
1. In your agent settings page
2. Look for **"Agent ID"** or **"API Configuration"**
3. **Copy the Agent ID** (looks like: `ag_xxxxxxxxxxxxxxxxx`)

### Method 2: From URL
1. Your agent's URL will be: `https://elevenlabs.io/app/conversational-ai/YOUR_AGENT_ID`
2. The last part of the URL is your Agent ID

### Add to Environment Variables

```bash
# Open .env.local
# Add or update this line:
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
```

---

## 🧪 Step 7: Test Your Agent

### In ElevenLabs Dashboard

1. **Click "Test AI Agent"** button
2. **Allow microphone access**
3. **Test each function:**
   - "Create a contact named Test User"
   - "Search for Test"
   - "Add a note: This is a test"
   - "Log a knock at 123 Test Street, disposition interested"

### In Your Application

1. **Restart your dev server** (to load new Agent ID)
   ```bash
   npm run dev
   ```

2. **Open your app** and navigate to voice assistant page

3. **Click "Start Voice Assistant"**

4. **Test with real scenarios:**
   ```
   "I just met John Smith at 456 Oak Avenue, he wants an estimate"
   "Search for contacts on Main Street"
   "Log a knock at 789 Pine Road, no answer"
   ```

---

## 🔧 Step 8: Advanced Configuration (Optional)

### Enable Analytics

1. In agent settings, go to **"Analytics"** or **"Evaluation"**
2. Configure criteria:
   ```
   - solved_user_inquiry
   - created_contact
   - logged_activity
   ```
3. Set up conversation tracking

### Add Knowledge Base

1. Go to **"Knowledge Base"** section
2. **Upload documents:**
   - Roofing terminology guide
   - Product specifications (GAF, Owens Corning)
   - Common Q&A
   - Pricing guidelines

3. Agent will use this for more accurate responses

### Configure Language Model

1. Go to **"Model Settings"**
2. **Recommended models for tools:**
   - ✅ **GPT-4o mini** (fast, accurate)
   - ✅ **Claude 3.5 Sonnet** (excellent reasoning)
   - ❌ **Avoid Gemini 1.5 Flash** (poor tool performance)

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] Agent created with blank template
- [ ] System prompt configured with roofing expertise
- [ ] All 5 client tools added with exact names
- [ ] All tool parameters defined correctly
- [ ] "Wait for response" enabled for all tools
- [ ] Voice selected and tested
- [ ] Agent ID copied to `.env.local`
- [ ] Dev server restarted
- [ ] Test conversation completed successfully
- [ ] Each tool tested and working

---

## 🚨 Troubleshooting

### Agent doesn't call tools
- ✅ Check tool names match exactly (case-sensitive)
- ✅ Ensure "Wait for response" is enabled
- ✅ Verify parameters schema is valid JSON
- ✅ Use GPT-4o mini or Claude 3.5 Sonnet model

### Tools not working in app
- ✅ Verify `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is set
- ✅ Restart dev server after adding Agent ID
- ✅ Check browser console for errors
- ✅ Verify API key is valid

### Poor voice quality
- ✅ Test different voices
- ✅ Check internet connection
- ✅ Reduce background noise
- ✅ Use headphones/earbuds

### Agent doesn't understand roofing terms
- ✅ Verify system prompt is configured
- ✅ Add roofing terminology to knowledge base
- ✅ Test with specific examples
- ✅ Refine prompt based on results

---

## 💰 Cost Optimization

**Current Costs:**
- OpenAI Realtime: $0.30/min
- ElevenLabs: $0.08/min
- **Savings: 73%**

**Usage Estimates:**
- 100 sessions/day × 5 min avg = 500 min/day
- OpenAI cost: $150/day = **$4,500/month**
- ElevenLabs cost: $40/day = **$1,200/month**
- **Monthly savings: $3,300**

**Free Tier:**
- 15 minutes included
- Good for initial testing
- Upgrade when ready for production

---

## 📚 Additional Resources

- **ElevenLabs Docs:** https://elevenlabs.io/docs/agents-platform/overview
- **Client Tools Guide:** https://elevenlabs.io/docs/conversational-ai/customization/tools/client-tools
- **Quickstart:** https://elevenlabs.io/docs/cookbooks/agents-platform/quickstart
- **SDK Documentation:** `/node_modules/@elevenlabs/client/README.md`
- **Voice Library:** https://elevenlabs.io/voice-library

---

## 🎯 Next Steps After Setup

1. **Test thoroughly** with real field scenarios
2. **Compare voice quality** with OpenAI
3. **Monitor costs** in ElevenLabs dashboard
4. **Refine system prompt** based on usage
5. **Add knowledge base** content
6. **Train team** on voice commands
7. **Deploy to production** when satisfied

---

## 📞 Support

- **ElevenLabs Support:** https://help.elevenlabs.io
- **Discord Community:** https://discord.gg/elevenlabs
- **API Status:** https://status.elevenlabs.io

**Setup Complete!** 🎉

Your ElevenLabs agent is ready for testing. Remember to add the Agent ID to your `.env.local` file and restart your dev server!
