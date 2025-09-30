# Archon Integration for Roofing SaaS Project

## What is Archon?
Archon is our centralized knowledge base and task management system for this project. It provides:
- **Knowledge Management**: Stores all project documentation with RAG-powered search
- **Task Tracking**: Manages our 20-week phased implementation
- **MCP Server**: Allows Claude Code to access project context consistently

## Quick Access
- **UI**: http://localhost:3737
- **MCP Server**: http://localhost:8051
- **API Server**: http://localhost:8181

## Project Structure in Archon

### Project Name: Tennessee Roofing SaaS Platform
- **Description**: Complete replacement for Proline CRM and Enzy door-knocking app
- **Timeline**: 20 weeks (5 phases × 4 weeks each)
- **Status**: Phase 1 - Core CRM

### Knowledge Base Contents
1. **PRD.md** - Product requirements document
2. **knowledge_base_roofing_platform.md** - Technical implementation guide
3. **roofing_industry_apis.md** - Industry-specific API documentation

### Task Organization

#### Phase 1: Core CRM (Weeks 1-4) - CURRENT
- [ ] Set up Next.js + Supabase project
- [ ] Create database schema for leads, contacts, projects
- [ ] Implement basic CRUD operations
- [ ] Build simple pipeline view
- [ ] Set up QuickBooks OAuth integration

#### Phase 2: Communication Hub (Weeks 5-8)
- [ ] Integrate Twilio for SMS
- [ ] Set up email templates with Resend
- [ ] Implement basic call logging
- [ ] Create simple automation rules

#### Phase 3: Mobile PWA (Weeks 9-12)
- [ ] Configure PWA with offline capability
- [ ] Implement photo upload to Supabase Storage
- [ ] Add territory map with Mapbox/Google Maps
- [ ] Build basic gamification features

#### Phase 4: AI Assistant (Weeks 13-16)
- [ ] Integrate OpenAI for chat functionality
- [ ] Set up RAG using Supabase Vector
- [ ] Implement voice input with Web Speech API
- [ ] Create automated report generation

#### Phase 5: Financial Integration (Weeks 17-20)
- [ ] Complete QuickBooks invoice sync
- [ ] Implement payment tracking
- [ ] Build basic P&L reporting
- [ ] Add job costing features

## How Claude Code Instances Should Use Archon

### 1. On Session Start
```bash
# Check if Archon is running
cd /Users/ccai/archon && docker compose ps

# If not running, start it
docker compose up -d
```

### 2. Query Knowledge Base
Use MCP tools to search for:
- Implementation details
- API documentation
- Project requirements
- Technical specifications

### 3. Task Management
- Check current phase tasks in Archon
- Mark tasks as in-progress when starting
- Update task status as completed
- Add notes or blockers to tasks

### 4. Documentation Updates
When creating new documentation:
1. Save to project folder first
2. Upload to Archon Knowledge Base
3. Tag appropriately for searchability

## Troubleshooting

### If Archon is not accessible:
```bash
# Restart Archon
cd /Users/ccai/archon
docker compose down
docker compose up -d

# Check logs
docker compose logs -f
```

### If MCP connection fails:
- Verify port 8051 is accessible
- Check Archon MCP service is healthy
- Review connection configuration in Claude Code

## Important Notes

1. **Single Source of Truth**: Archon is the authoritative source for project documentation and tasks
2. **Regular Updates**: Keep tasks and documentation current in Archon
3. **Cross-Session Consistency**: All Claude instances should reference Archon for context
4. **Phased Approach**: Strictly follow the phases - don't jump ahead

## Integration Benefits

1. **Consistency**: All Claude instances work from the same knowledge base
2. **Progress Tracking**: Clear visibility of what's done and what's next
3. **Context Preservation**: No loss of context between sessions
4. **Smart Search**: RAG-powered search finds relevant information quickly
5. **Real-time Updates**: Changes are immediately available to all users

Remember: Archon ensures that whether it's you or any Claude instance working on this project, everyone has the same context and is working toward the same goals.