#!/usr/bin/env python3
"""
Create Harness Control Tower Project in Archon

This script creates a comprehensive project for building a web/mobile interface
to monitor and control autonomous agent harness sessions from anywhere.
"""

import asyncio
import httpx
from datetime import datetime
from typing import List, Dict

# Archon MCP configuration
ARCHON_BASE_URL = "http://localhost:8181"
PROJECT_NAME = "Harness Control Tower"
PROJECT_DESCRIPTION = """
Web and mobile interface for monitoring and controlling autonomous agent harness sessions.

Goal: Enable remote access to harness operations from any device (phone, tablet, laptop)
allowing users to start sessions, monitor progress, view outputs, and receive notifications
from anywhere in the world.

Architecture: FastAPI backend + Next.js PWA frontend + WebSocket real-time updates
Deployment: Local (Mac Studio + Tailscale) or Cloud (Railway/Fly.io)

Based on: Autonomous PRD Generation Harness + Archon MCP
User Story: "I want to monitor PRD generation from my phone while at a coffee shop"
"""

# Task definitions organized by feature area
TASKS = [
    # ============================================================================
    # 1. PROJECT SETUP & ARCHITECTURE (Priority: 100)
    # ============================================================================
    {
        "title": "Project Architecture Document",
        "description": """Design comprehensive architecture for Control Tower.

Components:
- System architecture diagram
- Technology stack decisions
- Data flow diagrams
- API design (REST + WebSocket)
- Database schema
- Deployment options (local vs cloud)
- Security architecture

Deliverables:
- ARCHITECTURE.md
- API_DESIGN.md
- DEPLOYMENT_OPTIONS.md

Success Criteria:
- All major components documented
- Technology choices justified
- Security considerations addressed
""",
        "priority": 100,
        "feature": "architecture",
        "estimated_hours": 4,
        "dependencies": []
    },
    {
        "title": "Initialize Monorepo Structure",
        "description": """Create project structure with backend and frontend.

Directory structure:
```
harness-control-tower/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── README.md
└── .env.example
```

Setup:
- Python 3.11+ for backend
- Node 20+ for frontend
- Git repository initialization
- .gitignore configuration
- Pre-commit hooks

Success Criteria:
- Clean monorepo structure
- Both environments runnable
- Docker compose setup works
""",
        "priority": 100,
        "feature": "setup",
        "estimated_hours": 2,
        "dependencies": ["Project Architecture Document"]
    },

    # ============================================================================
    # 2. DATABASE & MODELS (Priority: 95)
    # ============================================================================
    {
        "title": "Database Schema Design",
        "description": """Design PostgreSQL schema for Control Tower.

Tables:
1. sessions - Track harness sessions
2. session_metrics - Per-session quality metrics
3. projects - Harness projects configuration
4. outputs - Generated files metadata
5. users - Authentication (if multi-user)
6. notifications - Alert queue

Indexes:
- sessions(status, started_at)
- session_metrics(session_id, session_number)
- outputs(session_id, created_at)

Deliverable: database_schema.sql

Success Criteria:
- All entities modeled
- Proper indexes defined
- Foreign keys established
""",
        "priority": 95,
        "feature": "database",
        "estimated_hours": 3,
        "dependencies": ["Project Architecture Document"]
    },
    {
        "title": "SQLAlchemy Models & Alembic Migrations",
        "description": """Implement database models and migration system.

Models:
- Session (id, project_id, status, model, progress)
- SessionMetrics (session_number, files_examined, validations)
- Project (name, source_path, output_path, config)
- Output (session_id, file_path, size, created_at)

Setup Alembic:
- Initial migration
- Migration scripts
- Seed data

Success Criteria:
- All models implemented
- Migrations run successfully
- Seed data loads
""",
        "priority": 95,
        "feature": "database",
        "estimated_hours": 4,
        "dependencies": ["Database Schema Design"]
    },

    # ============================================================================
    # 3. BACKEND CORE (Priority: 90)
    # ============================================================================
    {
        "title": "FastAPI Application Setup",
        "description": """Initialize FastAPI application with core structure.

Setup:
- FastAPI app factory
- CORS configuration
- Environment variables (pydantic-settings)
- Database connection pooling
- Error handling middleware
- Logging configuration
- Health check endpoint

Structure:
```
app/
├── main.py
├── config.py
├── database.py
├── models/
├── routers/
├── services/
└── utils/
```

Success Criteria:
- FastAPI app runs
- Database connects
- Health check returns 200
- Logging works
""",
        "priority": 90,
        "feature": "backend-core",
        "estimated_hours": 3,
        "dependencies": ["SQLAlchemy Models & Alembic Migrations"]
    },
    {
        "title": "Harness Runner Service",
        "description": """Service to launch and manage harness sessions.

Features:
- Start harness subprocess
- Capture stdout/stderr
- Monitor process status
- Graceful shutdown
- Resume from checkpoint
- Kill/restart capability

Implementation:
```python
class HarnessRunner:
    async def start_session(config: HarnessConfig) -> str
    async def stop_session(session_id: str) -> bool
    async def get_session_status(session_id: str) -> SessionStatus
    async def stream_logs(session_id: str) -> AsyncIterator[str]
```

Success Criteria:
- Can start harness sessions
- Logs captured in real-time
- Sessions tracked in DB
- Clean process management
""",
        "priority": 90,
        "feature": "backend-core",
        "estimated_hours": 6,
        "dependencies": ["FastAPI Application Setup"]
    },
    {
        "title": "Session Management API Endpoints",
        "description": """REST API endpoints for session management.

Endpoints:
- POST /api/sessions - Create new session
- GET /api/sessions - List all sessions
- GET /api/sessions/{id} - Get session details
- POST /api/sessions/{id}/start - Start session
- POST /api/sessions/{id}/pause - Pause session
- POST /api/sessions/{id}/stop - Stop session
- DELETE /api/sessions/{id} - Delete session

Request/Response schemas:
- SessionCreate
- SessionResponse
- SessionList
- SessionStatus

Success Criteria:
- All CRUD operations work
- Proper error handling
- OpenAPI docs generated
""",
        "priority": 90,
        "feature": "backend-api",
        "estimated_hours": 4,
        "dependencies": ["Harness Runner Service"]
    },
    {
        "title": "Project Management API Endpoints",
        "description": """REST API for managing harness projects.

Endpoints:
- POST /api/projects - Create project
- GET /api/projects - List projects
- GET /api/projects/{id} - Get project
- PUT /api/projects/{id} - Update project
- DELETE /api/projects/{id} - Delete project
- GET /api/projects/{id}/sessions - List project sessions

Features:
- Project templates (PRD, API Docs, User Guides)
- Configuration validation
- Archon integration (read Archon project data)

Success Criteria:
- Full project CRUD
- Template system works
- Archon data accessible
""",
        "priority": 85,
        "feature": "backend-api",
        "estimated_hours": 5,
        "dependencies": ["Session Management API Endpoints"]
    },
    {
        "title": "Real-Time WebSocket Server",
        "description": """WebSocket server for live session updates.

WebSocket endpoints:
- /ws/session/{session_id}/logs - Stream console output
- /ws/session/{session_id}/progress - Real-time progress updates
- /ws/session/{session_id}/metrics - Quality metrics stream

Features:
- Connection management
- Automatic reconnection handling
- Heartbeat/ping-pong
- Message queuing
- Broadcast to multiple clients

Success Criteria:
- Logs stream in real-time (<100ms latency)
- Progress updates every 2 seconds
- Handles client disconnects gracefully
- Multiple clients can connect
""",
        "priority": 90,
        "feature": "backend-websocket",
        "estimated_hours": 5,
        "dependencies": ["Harness Runner Service"]
    },

    # ============================================================================
    # 4. QUALITY ANALYTICS (Priority: 80)
    # ============================================================================
    {
        "title": "Quality Metrics Collection Service",
        "description": """Service to collect and aggregate quality metrics.

Metrics to track:
- Files examined per session
- Validations performed
- RAG queries executed
- Output size (lines, bytes)
- Session duration
- Cost (API usage)
- Error rate

Implementation:
- Parse .archon_project.json for session data
- Parse harness output for metrics
- Store in session_metrics table
- Calculate trends over time

Success Criteria:
- Metrics collected after each session
- Historical data preserved
- Trends calculable
""",
        "priority": 80,
        "feature": "analytics",
        "estimated_hours": 4,
        "dependencies": ["SQLAlchemy Models & Alembic Migrations"]
    },
    {
        "title": "Quality Analytics API Endpoints",
        "description": """API endpoints for quality analytics data.

Endpoints:
- GET /api/analytics/sessions/{id}/metrics - Session metrics
- GET /api/analytics/projects/{id}/trends - Quality trends
- GET /api/analytics/projects/{id}/cost - Cost analysis
- GET /api/analytics/dashboard - Dashboard summary

Features:
- Aggregation queries
- Time-series data
- Comparison views (session-to-session)
- Export to CSV/JSON

Success Criteria:
- Metrics queryable
- Trends visible over time
- Dashboard data complete
""",
        "priority": 80,
        "feature": "analytics",
        "estimated_hours": 3,
        "dependencies": ["Quality Metrics Collection Service"]
    },

    # ============================================================================
    # 5. FILE OUTPUT MANAGEMENT (Priority: 75)
    # ============================================================================
    {
        "title": "Output File Indexing Service",
        "description": """Service to index and track generated files.

Features:
- Watch output directory for new files
- Index file metadata (size, type, created_at)
- Store in outputs table
- Track file associations to sessions
- Calculate diff between runs

Implementation:
- Watchdog file system monitoring
- Periodic scanning
- File hash calculation (for change detection)

Success Criteria:
- New files indexed within 5 seconds
- Metadata accurate
- Historical versions tracked
""",
        "priority": 75,
        "feature": "file-management",
        "estimated_hours": 4,
        "dependencies": ["SQLAlchemy Models & Alembic Migrations"]
    },
    {
        "title": "File Viewing & Download API",
        "description": """API endpoints for viewing and downloading outputs.

Endpoints:
- GET /api/outputs - List all outputs
- GET /api/outputs/{id} - Get output metadata
- GET /api/outputs/{id}/content - Get file content
- GET /api/outputs/{id}/download - Download file
- GET /api/outputs/{id}/preview - Markdown preview

Features:
- Markdown rendering
- Syntax highlighting for code
- Pagination for large files
- Streaming downloads

Success Criteria:
- Files viewable in browser
- Downloads work
- Markdown renders correctly
""",
        "priority": 75,
        "feature": "file-management",
        "estimated_hours": 3,
        "dependencies": ["Output File Indexing Service"]
    },

    # ============================================================================
    # 6. FRONTEND FOUNDATION (Priority: 85)
    # ============================================================================
    {
        "title": "Next.js Application Setup",
        "description": """Initialize Next.js 15 application with PWA support.

Setup:
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- PWA configuration (next-pwa)
- Environment variables
- API client (axios/fetch)

Structure:
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── (dashboard)/
├── components/
├── lib/
└── types/
```

PWA Features:
- manifest.json
- Service worker
- Offline support
- Install prompt

Success Criteria:
- App runs on localhost:3000
- PWA installable on mobile
- TypeScript configured
- Tailwind working
""",
        "priority": 85,
        "feature": "frontend-setup",
        "estimated_hours": 3,
        "dependencies": ["Initialize Monorepo Structure"]
    },
    {
        "title": "UI Component Library Setup",
        "description": """Setup component library and design system.

Options:
- shadcn/ui (recommended)
- Headless UI
- Radix UI

Components needed:
- Button, Input, Select, Checkbox
- Card, Dialog, Dropdown
- Table, Tabs, Tooltip
- Progress Bar, Spinner
- Badge, Alert

Theme:
- Color palette
- Typography scale
- Spacing system
- Dark mode support

Success Criteria:
- Component library installed
- All base components available
- Dark mode toggleable
- Consistent styling
""",
        "priority": 85,
        "feature": "frontend-ui",
        "estimated_hours": 2,
        "dependencies": ["Next.js Application Setup"]
    },
    {
        "title": "API Client & State Management",
        "description": """Setup API client and state management.

API Client:
- Axios instance with interceptors
- TypeScript types for all endpoints
- Error handling
- Request/response logging

State Management:
- React Context for global state
- SWR or React Query for data fetching
- WebSocket hook for real-time updates

Implementation:
```typescript
// lib/api/client.ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
})

// hooks/useSession.ts
export function useSession(sessionId: string) {
  const { data, error } = useSWR(`/api/sessions/${sessionId}`)
  return { session: data, isLoading: !error && !data, error }
}
```

Success Criteria:
- API calls work from frontend
- Types generated from OpenAPI
- Error handling consistent
- Loading states managed
""",
        "priority": 85,
        "feature": "frontend-core",
        "estimated_hours": 4,
        "dependencies": ["UI Component Library Setup"]
    },

    # ============================================================================
    # 7. DASHBOARD VIEWS (Priority: 80)
    # ============================================================================
    {
        "title": "Dashboard Home Page",
        "description": """Main dashboard overview page.

Sections:
1. Active Sessions (currently running)
2. Recent Sessions (last 10)
3. Quick Stats (total sessions, success rate, avg duration)
4. Quick Actions (Start New Session button)

Features:
- Real-time status updates
- Session cards with progress bars
- Color-coded status indicators
- Click to view details

Success Criteria:
- Dashboard loads in <1 second
- Real-time updates work
- Responsive design (mobile-friendly)
""",
        "priority": 80,
        "feature": "frontend-dashboard",
        "estimated_hours": 5,
        "dependencies": ["API Client & State Management"]
    },
    {
        "title": "Session Detail Page",
        "description": """Detailed view of a single session.

Components:
1. Session Header (name, status, model, duration)
2. Progress Section (current task, % complete)
3. Live Console Output (streaming logs)
4. Quality Metrics Panel (files, validations, RAG queries)
5. Control Panel (pause, stop, resume buttons)
6. Output Files List

Real-time features:
- WebSocket connection for logs
- Progress bar updates
- Metrics auto-refresh

Success Criteria:
- All session data visible
- Logs stream in real-time
- Controls work (pause/stop/resume)
- Mobile responsive
""",
        "priority": 80,
        "feature": "frontend-dashboard",
        "estimated_hours": 6,
        "dependencies": ["Dashboard Home Page", "Real-Time WebSocket Server"]
    },
    {
        "title": "Session Creation Flow",
        "description": """Multi-step form to create new session.

Steps:
1. Select Project (or create new)
2. Configure Session:
   - Model selection (Opus/Sonnet/Haiku)
   - Max sessions limit
   - Custom prompt overrides
3. Review & Start

Validation:
- Source code path exists
- Output directory writable
- Archon reachable
- Required env vars set

Success Criteria:
- Wizard flow intuitive
- Validation clear
- Session starts successfully
- User redirected to detail page
""",
        "priority": 80,
        "feature": "frontend-forms",
        "estimated_hours": 5,
        "dependencies": ["Session Detail Page"]
    },
    {
        "title": "Projects Management Page",
        "description": """Page to manage harness projects.

Features:
- List all projects (table view)
- Create new project form
- Edit project configuration
- Delete project (with confirmation)
- View project sessions history

Project Card:
- Name, description
- Source code path
- Last run date
- Success rate
- Quick start button

Success Criteria:
- CRUD operations work
- Projects list loads quickly
- Search/filter functional
""",
        "priority": 75,
        "feature": "frontend-dashboard",
        "estimated_hours": 4,
        "dependencies": ["Dashboard Home Page"]
    },
    {
        "title": "Quality Analytics Dashboard",
        "description": """Analytics page with quality metrics.

Visualizations:
1. Quality Trends Chart (files examined over time)
2. Session Duration Chart
3. Cost Analysis (API usage)
4. Success Rate Pie Chart
5. Top Files Examined (table)

Filters:
- Date range
- Project
- Model

Charts:
- Use recharts or chart.js
- Interactive tooltips
- Responsive

Success Criteria:
- Charts render correctly
- Data updates in real-time
- Filters work
- Export to CSV available
""",
        "priority": 75,
        "feature": "frontend-analytics",
        "estimated_hours": 6,
        "dependencies": ["Quality Analytics API Endpoints"]
    },

    # ============================================================================
    # 8. REAL-TIME FEATURES (Priority: 85)
    # ============================================================================
    {
        "title": "WebSocket Client Hook",
        "description": """React hook for WebSocket connections.

Implementation:
```typescript
export function useWebSocket(url: string) {
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => setIsConnected(true)
    ws.onmessage = (event) => setData(JSON.parse(event.data))
    ws.onclose = () => setIsConnected(false)
    ws.onerror = (error) => console.error(error)

    return () => ws.close()
  }, [url])

  return { data, isConnected }
}
```

Features:
- Auto-reconnect on disconnect
- Connection status indicator
- Message queuing
- Error handling

Success Criteria:
- Hook works reliably
- Reconnects automatically
- No memory leaks
""",
        "priority": 85,
        "feature": "frontend-realtime",
        "estimated_hours": 3,
        "dependencies": ["API Client & State Management"]
    },
    {
        "title": "Live Console Component",
        "description": """Terminal-like component for streaming logs.

Features:
- Auto-scroll to bottom
- Search/filter logs
- Download logs
- Color-coded log levels
- Copy to clipboard
- Virtual scrolling (for performance)

Styling:
- Monospace font
- Dark terminal theme
- Line numbers
- Syntax highlighting

Success Criteria:
- Handles 10,000+ log lines
- No performance degradation
- Auto-scroll works
- Search functional
""",
        "priority": 85,
        "feature": "frontend-components",
        "estimated_hours": 4,
        "dependencies": ["WebSocket Client Hook"]
    },
    {
        "title": "Real-Time Progress Indicators",
        "description": """Components for showing live progress.

Components:
1. LinearProgressBar (0-100%)
2. CircularProgress (spinner)
3. SessionProgressCard (current task, ETA)
4. TaskListProgress (checkmarks)

Features:
- Smooth animations
- Color transitions (green = good, red = error)
- Time estimates (ETA)
- Percentage display

Success Criteria:
- Updates smooth (no jank)
- Accurate percentages
- ETA calculated correctly
""",
        "priority": 80,
        "feature": "frontend-components",
        "estimated_hours": 3,
        "dependencies": ["WebSocket Client Hook"]
    },

    # ============================================================================
    # 9. MOBILE OPTIMIZATION (Priority: 75)
    # ============================================================================
    {
        "title": "PWA Configuration & Offline Support",
        "description": """Configure PWA features for mobile installation.

PWA Features:
- manifest.json (name, icons, theme)
- Service worker (cache strategy)
- Offline fallback page
- Install prompt
- Update notification

Cache Strategy:
- API responses: Network-first
- Static assets: Cache-first
- Images: Cache-first, lazy load

Success Criteria:
- App installable on iOS/Android
- Works offline (graceful degradation)
- Install prompt appears
- Icons display correctly
""",
        "priority": 75,
        "feature": "mobile",
        "estimated_hours": 3,
        "dependencies": ["Next.js Application Setup"]
    },
    {
        "title": "Mobile-Responsive Layouts",
        "description": """Optimize all pages for mobile screens.

Breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

Optimizations:
- Touch-friendly buttons (min 44px)
- Bottom navigation on mobile
- Drawer menus
- Collapsible sections
- Swipe gestures

Test on:
- iPhone 14 Pro (393x852)
- Pixel 7 (412x915)
- iPad (768x1024)

Success Criteria:
- All pages usable on mobile
- No horizontal scroll
- Text readable without zoom
- Gestures work
""",
        "priority": 75,
        "feature": "mobile",
        "estimated_hours": 5,
        "dependencies": ["Dashboard Home Page", "Session Detail Page"]
    },

    # ============================================================================
    # 10. NOTIFICATIONS (Priority: 70)
    # ============================================================================
    {
        "title": "Push Notification System",
        "description": """Implement push notifications for key events.

Events to notify:
- Session complete
- Session error
- Quality degradation warning
- Long-running session alert

Technologies:
- Web Push API
- Firebase Cloud Messaging (optional)
- Browser notifications

Features:
- User can subscribe/unsubscribe
- Notification preferences
- Do Not Disturb hours
- Notification history

Success Criteria:
- Notifications work on mobile
- User preferences saved
- Notifications arrive within 30 seconds
""",
        "priority": 70,
        "feature": "notifications",
        "estimated_hours": 5,
        "dependencies": ["FastAPI Application Setup"]
    },
    {
        "title": "In-App Notification Center",
        "description": """Notification center within the app.

Features:
- Bell icon with unread count
- Dropdown notification list
- Mark as read
- Clear all
- Notification types (success, warning, error, info)

Persistence:
- Store in notifications table
- 30-day retention
- Pagination

Success Criteria:
- Notifications display in real-time
- History accessible
- Unread count accurate
""",
        "priority": 70,
        "feature": "notifications",
        "estimated_hours": 3,
        "dependencies": ["Dashboard Home Page"]
    },

    # ============================================================================
    # 11. AUTHENTICATION & SECURITY (Priority: 90)
    # ============================================================================
    {
        "title": "Authentication System",
        "description": """Implement authentication for multi-user support.

Options:
- Simple: Magic link email auth
- OAuth: Google, GitHub
- Self-hosted: Username/password

Features:
- JWT tokens
- Refresh tokens
- Session management
- Logout

Endpoints:
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh

Success Criteria:
- Users can log in
- Tokens secure (httpOnly cookies)
- Sessions persist
- Logout works
""",
        "priority": 90,
        "feature": "auth",
        "estimated_hours": 6,
        "dependencies": ["FastAPI Application Setup"]
    },
    {
        "title": "Authorization & Permissions",
        "description": """Implement role-based access control.

Roles:
- Admin: Full access
- User: Own sessions only
- Viewer: Read-only

Permissions:
- Create/edit/delete sessions
- View session logs
- Manage projects
- View analytics

Implementation:
- Decorator for route protection
- Middleware for permission checks
- Database role storage

Success Criteria:
- Roles enforced
- Unauthorized requests blocked (401/403)
- UI adapts to permissions
""",
        "priority": 85,
        "feature": "auth",
        "estimated_hours": 4,
        "dependencies": ["Authentication System"]
    },
    {
        "title": "API Security Hardening",
        "description": """Implement security best practices.

Features:
- Rate limiting (per IP, per user)
- API key authentication (for external access)
- Input validation (Pydantic models)
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitization)
- CORS configuration
- HTTPS enforcement

Monitoring:
- Failed auth attempts logging
- Suspicious activity alerts
- Audit log

Success Criteria:
- OWASP Top 10 addressed
- Rate limiting works (429 status)
- Penetration test passed
""",
        "priority": 90,
        "feature": "security",
        "estimated_hours": 5,
        "dependencies": ["Authentication System"]
    },

    # ============================================================================
    # 12. DEPLOYMENT & DEVOPS (Priority: 85)
    # ============================================================================
    {
        "title": "Docker Containerization",
        "description": """Containerize backend and frontend.

Dockerfiles:
- backend/Dockerfile (Python, FastAPI)
- frontend/Dockerfile (Node, Next.js)

docker-compose.yml:
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgres://...

  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  postgres:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
```

Success Criteria:
- docker-compose up works
- All services start
- Data persists
""",
        "priority": 85,
        "feature": "deployment",
        "estimated_hours": 3,
        "dependencies": ["FastAPI Application Setup", "Next.js Application Setup"]
    },
    {
        "title": "Tailscale VPN Deployment Guide",
        "description": """Documentation for local deployment with Tailscale.

Steps:
1. Install Tailscale on Mac Studio
2. Configure firewall rules
3. Start backend on Mac Studio
4. Access from phone via Tailscale IP
5. Add to home screen (PWA)

Configuration:
- Tailscale ACLs
- Port forwarding
- DNS setup

Troubleshooting:
- Connection issues
- Performance optimization
- SSL/TLS certificates

Deliverable: DEPLOYMENT_LOCAL.md

Success Criteria:
- Clear step-by-step guide
- Tested on iOS and Android
- Screenshots included
""",
        "priority": 85,
        "feature": "deployment",
        "estimated_hours": 2,
        "dependencies": ["Docker Containerization"]
    },
    {
        "title": "Cloud Deployment (Railway/Fly.io)",
        "description": """Deploy to cloud platform for public access.

Platforms:
- Railway (recommended for simplicity)
- Fly.io (recommended for performance)
- Render (alternative)

Setup:
- railway.json or fly.toml configuration
- Environment variable management
- Database provisioning (Postgres)
- Domain configuration (optional)

CI/CD:
- GitHub Actions workflow
- Auto-deploy on main branch push

Deliverable: DEPLOYMENT_CLOUD.md

Success Criteria:
- App accessible via HTTPS
- Database migrations run
- Zero-downtime deploys
""",
        "priority": 80,
        "feature": "deployment",
        "estimated_hours": 4,
        "dependencies": ["Docker Containerization"]
    },
    {
        "title": "Monitoring & Observability",
        "description": """Setup monitoring and logging.

Backend Monitoring:
- Application logs (structured JSON)
- Error tracking (Sentry)
- Performance metrics (response times)
- Database query performance

Frontend Monitoring:
- Error tracking (Sentry)
- Web Vitals
- User analytics (optional)

Dashboards:
- Uptime monitoring
- Error rate alerts
- Performance degradation alerts

Success Criteria:
- Errors reported to Sentry
- Logs searchable
- Alerts configured
""",
        "priority": 75,
        "feature": "monitoring",
        "estimated_hours": 3,
        "dependencies": ["Cloud Deployment (Railway/Fly.io)"]
    },

    # ============================================================================
    # 13. TESTING (Priority: 70)
    # ============================================================================
    {
        "title": "Backend Unit Tests",
        "description": """Write unit tests for backend services.

Test coverage:
- HarnessRunner service
- API endpoints
- Database models
- Utility functions

Framework: pytest

Fixtures:
- Test database
- Mock harness subprocess
- Sample session data

Success Criteria:
- Coverage > 80%
- All tests pass
- Tests run in < 10 seconds
""",
        "priority": 70,
        "feature": "testing",
        "estimated_hours": 6,
        "dependencies": ["Harness Runner Service", "Session Management API Endpoints"]
    },
    {
        "title": "Frontend Component Tests",
        "description": """Write tests for React components.

Test coverage:
- Dashboard components
- Session detail page
- Forms (session creation)
- WebSocket hook

Framework: Jest + React Testing Library

Success Criteria:
- Coverage > 70%
- All tests pass
- Tests run in < 5 seconds
""",
        "priority": 70,
        "feature": "testing",
        "estimated_hours": 5,
        "dependencies": ["Dashboard Home Page", "Session Detail Page"]
    },
    {
        "title": "End-to-End Tests",
        "description": """E2E tests for critical user flows.

Flows to test:
1. Create new session → Monitor progress → View output
2. View dashboard → Open session detail → Stop session
3. Create project → Configure → Start session

Framework: Playwright

Success Criteria:
- All flows pass
- Tests run in < 2 minutes
- Screenshots on failure
""",
        "priority": 65,
        "feature": "testing",
        "estimated_hours": 4,
        "dependencies": ["Frontend Component Tests"]
    },

    # ============================================================================
    # 14. DOCUMENTATION (Priority: 80)
    # ============================================================================
    {
        "title": "User Documentation",
        "description": """Write comprehensive user guide.

Sections:
1. Getting Started
2. Creating Your First Session
3. Monitoring Progress
4. Understanding Quality Metrics
5. Managing Projects
6. Mobile App Installation
7. Troubleshooting

Format: Markdown + Screenshots

Deliverable: docs/USER_GUIDE.md

Success Criteria:
- Covers all features
- Screenshots included
- Non-technical language
""",
        "priority": 80,
        "feature": "documentation",
        "estimated_hours": 4,
        "dependencies": ["Session Creation Flow", "Quality Analytics Dashboard"]
    },
    {
        "title": "Developer Documentation",
        "description": """Write technical documentation for developers.

Sections:
1. Architecture Overview
2. API Reference (OpenAPI)
3. Database Schema
4. WebSocket Protocol
5. Development Setup
6. Contributing Guide

Auto-generated:
- OpenAPI spec from FastAPI
- Database schema diagrams

Deliverable: docs/DEVELOPER_GUIDE.md

Success Criteria:
- Developers can setup locally
- All APIs documented
- Architecture clear
""",
        "priority": 75,
        "feature": "documentation",
        "estimated_hours": 3,
        "dependencies": ["Project Architecture Document"]
    },
    {
        "title": "README & Marketing Page",
        "description": """Create compelling README and landing page.

README.md:
- Project description
- Key features (bullet points)
- Screenshots/GIFs
- Quick start guide
- Links to docs

Landing Page (optional):
- Hero section with demo video
- Feature highlights
- Testimonials
- Call to action (GitHub star)

Success Criteria:
- README clear and compelling
- Screenshots showcase features
- Easy to get started
""",
        "priority": 75,
        "feature": "documentation",
        "estimated_hours": 3,
        "dependencies": ["User Documentation"]
    },

    # ============================================================================
    # 15. POLISH & FEATURES (Priority: 60)
    # ============================================================================
    {
        "title": "Dark Mode Toggle",
        "description": """Implement dark mode throughout app.

Features:
- System preference detection
- Manual toggle
- Persistent preference (localStorage)
- Smooth transition animation

Components to style:
- All pages
- Charts (color schemes)
- Console (terminal theme)

Success Criteria:
- Dark mode fully functional
- Contrast ratios meet WCAG
- Preference persists
""",
        "priority": 60,
        "feature": "polish",
        "estimated_hours": 2,
        "dependencies": ["UI Component Library Setup"]
    },
    {
        "title": "Session Templates",
        "description": """Pre-configured session templates.

Templates:
1. PRD Generation (default settings)
2. API Documentation
3. User Guide Generation
4. Code Implementation
5. Test Suite Generation

Features:
- Save custom templates
- Share templates (JSON export/import)
- Template marketplace (future)

Success Criteria:
- Templates speed up creation
- Custom templates saveable
- Import/export works
""",
        "priority": 60,
        "feature": "features",
        "estimated_hours": 3,
        "dependencies": ["Session Creation Flow"]
    },
    {
        "title": "Cost Optimization Dashboard",
        "description": """Track and optimize API costs.

Features:
- Cost per session
- Model cost comparison (Opus vs Sonnet)
- Monthly spending trends
- Budget alerts
- Cost projection

Recommendations:
- Suggest cheaper models for tasks
- Identify expensive sessions
- Optimization tips

Success Criteria:
- Accurate cost tracking
- Useful recommendations
- Budget alerts work
""",
        "priority": 60,
        "feature": "features",
        "estimated_hours": 4,
        "dependencies": ["Quality Analytics Dashboard"]
    },
    {
        "title": "Session Sharing & Collaboration",
        "description": """Share session results with team.

Features:
- Generate shareable link
- Public read-only view
- Export session report (PDF)
- Comment on sessions

Permissions:
- Private (owner only)
- Team (authenticated users)
- Public (anyone with link)

Success Criteria:
- Links generate correctly
- Public view secure
- Export looks professional
""",
        "priority": 55,
        "feature": "features",
        "estimated_hours": 5,
        "dependencies": ["Session Detail Page", "Authorization & Permissions"]
    },
]


async def create_project():
    """Create the Control Tower project in Archon."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create project
        print("Creating Harness Control Tower project in Archon...")

        project_data = {
            "title": PROJECT_NAME,
            "description": PROJECT_DESCRIPTION,
            "status": "active",
        }

        response = await client.post(
            f"{ARCHON_BASE_URL}/api/projects",
            json=project_data
        )

        if response.status_code not in [200, 201]:
            print(f"Error creating project: {response.text}")
            return

        result = response.json()
        # Handle different response formats
        if "project_id" in result:
            project_id = result["project_id"]
        elif "project" in result and "id" in result["project"]:
            project_id = result["project"]["id"]
        elif "id" in result:
            project_id = result["id"]
        else:
            print(f"Unexpected response format: {result}")
            return

        print(f"✓ Project created: {project_id}")

        # Create META task
        print("\nCreating META tracking task...")

        meta_task = {
            "project_id": project_id,
            "title": "[META] Control Tower Development Progress Tracker",
            "description": f"""
Meta task for tracking overall development progress.

Created: {datetime.now().isoformat()}
Total tasks planned: {len(TASKS)}

This task tracks:
- Features completed
- Integration testing status
- Deployment readiness
- Open issues/blockers

Session handoff notes go here.
""",
            "status": "doing",
            "priority": 100,
            "task_order": 1
        }

        response = await client.post(
            f"{ARCHON_BASE_URL}/api/tasks",
            json=meta_task
        )

        meta_task_result = response.json()
        # Handle different response formats
        if "task_id" in meta_task_result:
            meta_task_id = meta_task_result["task_id"]
        elif "task" in meta_task_result and "id" in meta_task_result["task"]:
            meta_task_id = meta_task_result["task"]["id"]
        elif "id" in meta_task_result:
            meta_task_id = meta_task_result["id"]
        else:
            meta_task_id = "unknown"
        print(f"✓ META task created: {meta_task_id}")

        # Create development tasks
        print(f"\nCreating {len(TASKS)} development tasks...")

        task_map = {}  # title -> task_id for dependencies

        for idx, task_def in enumerate(TASKS):
            task_data = {
                "project_id": project_id,
                "title": task_def["title"],
                "description": task_def["description"],
                "status": "todo",
                "priority": task_def["priority"],
                "task_order": task_def["priority"],  # Use priority as order
                "labels": [task_def["feature"]],
                "estimated_hours": task_def.get("estimated_hours", 0),
            }

            response = await client.post(
                f"{ARCHON_BASE_URL}/api/tasks",
                json=task_data
            )

            if response.status_code in [200, 201]:
                task_result = response.json()
                # Handle different response formats
                if "task_id" in task_result:
                    task_id = task_result["task_id"]
                elif "task" in task_result and "id" in task_result["task"]:
                    task_id = task_result["task"]["id"]
                elif "id" in task_result:
                    task_id = task_result["id"]
                else:
                    task_id = "unknown"
                task_map[task_def["title"]] = task_id
                print(f"  ✓ [{idx+1}/{len(TASKS)}] {task_def['title']}")
            else:
                print(f"  ✗ Failed: {task_def['title']}")

        print(f"\n{'='*70}")
        print(f"PROJECT CREATED SUCCESSFULLY")
        print(f"{'='*70}")
        print(f"\nProject: {PROJECT_NAME}")
        print(f"ID: {project_id}")
        print(f"Tasks: {len(TASKS)} development tasks")
        print(f"META task: {meta_task_id}")
        print(f"\nFeature Areas:")

        features = {}
        for task in TASKS:
            feature = task["feature"]
            features[feature] = features.get(feature, 0) + 1

        for feature, count in sorted(features.items(), key=lambda x: -x[1]):
            print(f"  - {feature}: {count} tasks")

        total_hours = sum(t.get("estimated_hours", 0) for t in TASKS)
        print(f"\nEstimated effort: {total_hours} hours (~{total_hours/40:.1f} weeks)")

        print(f"\n{'='*70}")
        print("DEPLOYMENT OPTIONS:")
        print("1. Local (Mac Studio + Tailscale) - Recommended for you!")
        print("   - Zero cloud costs")
        print("   - Use local 70B models")
        print("   - Access from phone via VPN")
        print("")
        print("2. Cloud (Railway/Fly.io) - For team access")
        print("   - ~$20-40/month")
        print("   - Public HTTPS access")
        print("   - No VPN needed")
        print(f"{'='*70}")

        print(f"\n{'='*70}")
        print("NEXT STEPS:")
        print("1. Review tasks in Archon UI (http://localhost:8181)")
        print("2. Select Phase 1: Backend foundation tasks")
        print("3. Option A: Build manually using the tasks as guide")
        print("4. Option B: Use the HARNESS to build it autonomously! 🤯")
        print(f"{'='*70}")

        return project_id


if __name__ == "__main__":
    print(f"\n{'='*70}")
    print("HARNESS CONTROL TOWER - PROJECT CREATION")
    print("Web & Mobile Interface for Autonomous Agent Control")
    print(f"{'='*70}\n")

    asyncio.run(create_project())
