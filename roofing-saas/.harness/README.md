# Modernization Analysis Harness

Autonomous harness for systematically analyzing and modernizing the Roofing SAAS application architecture.

## Overview

This harness uses the Claude Agent SDK with Archon for task management and Puppeteer for web research to:

1. **Read existing PRD documentation** from `../docs/PRD/`
2. **Review actual source code** to find discrepancies
3. **Update PRDs** when code has drifted from documentation
4. **Research modern alternatives** (5+ websites per section)
5. **Challenge assumptions** with devil's advocate analysis
6. **Generate comprehensive recommendations** with ROI estimates

## Key Features

### Build vs Buy vs Open Source Analysis
For every paid service (Supabase, Twilio, etc.), evaluates:
- Current paid SaaS costs and features
- Open source self-hosted alternatives
- Build custom with AI coding (Claude/Cursor estimates)
- Different paid service competitors
- ROI and break-even analysis

### Security-First Analysis
- Framework CVEs and security advisories
- npm dependency supply chain risks
- Service-level security (SOC 2, data residency)
- Self-hosted security responsibilities
- Data sovereignty & GDPR compliance

### Then vs Now Comparison
Compares September 2025 (project start) vs December 2025 (now):
- Framework updates and new features
- Pricing changes
- New capabilities that emerged
- Hindsight: "Would we choose differently today?"

## Prerequisites

### 1. Archon Server Running
```bash
# Verify Archon is accessible
curl http://localhost:1337

# If not running, start Archon (from your Archon directory)
docker-compose up -d
```

### 2. Python Environment
```bash
# Python 3.11+ recommended
python --version

# Install Claude Agent SDK (if not already installed)
pip install claude-sdk
```

### 3. MCP Servers Available
- **Archon MCP**: Task management + RAG knowledge base
- **Puppeteer MCP**: Browser automation for web research

### 4. Environment Variables
```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Optional: Set Archon URL if different from default
export ARCHON_MCP_URL="http://localhost:8051/mcp"
```

## How to Run

### Quick Start
```bash
cd /Users/ccai/roofing\ saas/roofing-saas/.harness
python autonomous_modernization_demo.py
```

This will:
1. Connect to Archon project `1571bfc9-fd2c-4d89-b2a0-e24f726c64aa`
2. Pick the highest priority task (next PRD section to analyze)
3. Run a single analysis session (15-30 minutes)
4. Generate analysis document in `../docs/modernization-analysis/`
5. Capture screenshots in `../docs/modernization-analysis/research-screenshots/`
6. Update original PRD if discrepancies found (tracked in Git)
7. Mark task complete in Archon
8. Exit (one task per session for fresh context)

### Full 32-Section Run
To analyze all 32 PRD sections (8-16 hours):
```bash
# Run in a persistent shell (tmux/screen recommended)
cd .harness
for i in {1..32}; do
  python autonomous_modernization_demo.py
  echo "Session $i complete. Waiting 5 minutes before next session..."
  sleep 300  # 5 minute pause between sessions
done
```

Or simply run it 32 times manually, reviewing output between sessions.

## Project Structure

```
.harness/
├── README.md                              # This file
├── autonomous_modernization_demo.py       # Entry point
├── agent_modernization.py                 # Session orchestrator
├── client_modernization.py                # Claude SDK config + MCP setup
├── modernization_config.py                # Configuration constants
├── progress_modernization.py              # State tracking
├── prompts_modernization.py               # Prompt loading
└── prompts/
    ├── modernization_initializer_prompt.md    # Initialization logic (~400 lines)
    └── modernization_analysis_prompt.md       # Core analysis logic (~1,500 lines)

../docs/
├── PRD/                                   # Product Requirements (32 sections)
│   ├── INDEX.md
│   ├── 00-EXECUTIVE-OVERVIEW.md
│   ├── 01-TECHNICAL-ARCHITECTURE.md
│   └── ... (32 total)
└── modernization-analysis/                # Analysis outputs
    ├── MODERNIZATION-INDEX.md             # Progress tracker
    ├── .modernization_project.json        # State file
    ├── 00-MODERNIZATION-EXECUTIVE-OVERVIEW.md
    └── research-screenshots/              # Puppeteer captures
```

## Output

Each session produces:

### 1. Modernization Analysis Document
Location: `../docs/modernization-analysis/[XX]-MODERNIZATION-[SECTION-NAME].md`

Includes:
- PRD accuracy assessment (discrepancies found)
- Current implementation analysis (strengths & pain points)
- Modern alternatives research (5+ websites)
- Build vs Buy vs Open Source comparison
- Security analysis (CVEs, supply chain, compliance)
- Architecture & deployment analysis (edge vs centralized)
- Devil's advocate questions (3+ assumptions challenged)
- Then vs Now comparison (Sept → Dec 2025)
- Innovation opportunities (quick wins, medium improvements, major rearchitecture)
- Prioritized recommendations (with ROI estimates)

### 2. Research Screenshots
Location: `../docs/modernization-analysis/research-screenshots/`

5+ screenshots per section from:
- Official documentation (React, Next.js, Supabase, etc.)
- Alternative product pages
- Pricing comparisons
- Benchmark results
- GitHub trending

### 3. PRD Updates (If Needed)
If discrepancies found between PRD and code:
- Original PRD files in `../docs/PRD/` are updated
- Changes tracked in Git
- Documented in the analysis

## Quality Standards

Each analysis must meet:
- ✅ 5+ websites researched
- ✅ 5+ screenshots captured
- ✅ 3+ assumptions challenged (with ROI)
- ✅ PRD updated if discrepancies found
- ✅ Then vs Now comparison for major technologies
- ✅ Specific, actionable recommendations with effort estimates
- ✅ All research sources cited with URLs

## Monitoring Progress

### Check Archon Dashboard
Visit http://localhost:1337 to see:
- Tasks completed (should increase by 1 per session)
- Next task to be analyzed
- META task with session summaries

### Check Progress File
```bash
cat ../docs/modernization-analysis/.modernization_project.json | jq
```

Shows:
- Sections analyzed
- Total recommendations
- Research URLs visited
- Screenshots captured
- Session history

### Check Output Directory
```bash
ls ../docs/modernization-analysis/
```

Should show analysis files accumulating (one per session).

## Troubleshooting

### Archon Connection Failed
```bash
# Check if Archon is running
curl http://localhost:1337

# Check Docker containers
docker ps | grep archon

# Restart Archon if needed
cd /path/to/archon
docker-compose restart
```

### Puppeteer Screenshot Failed
- Check internet connection (Puppeteer needs stable connection)
- Screenshots are captured but harness continues even if some fail
- Manual fallback: Research URLs are documented, can screenshot manually

### PRD Update Failed
- Check file permissions on `../docs/PRD/` directory
- Ensure files aren't open in another editor
- Git conflicts? Review with `git status`

### Task Not Found
If Archon project is missing or corrupted:
```bash
# Re-run initialization (creates project + 33 tasks)
# This is safe - won't duplicate if project exists
python autonomous_modernization_demo.py
```

## Architecture Notes

### One Task Per Session
Each session:
- Connects with fresh Claude context
- Analyzes exactly ONE PRD section
- Writes analysis document
- Updates Archon task status
- Exits cleanly

This prevents context exhaustion and enables parallelization.

### State Management
- **Archon**: Task queue, priorities, completion tracking
- **JSON file**: Project metadata, session history, metrics
- **MODERNIZATION-INDEX.md**: Human-readable progress tracker

### MCP Integration
- **Archon MCP**: Provides task management + RAG access to source code
- **Puppeteer MCP**: Enables browser automation for research
- Both run as separate services, harness connects via MCP protocol

## Cost Estimate

- **Model**: Claude Opus 4.5 (better reasoning for critical analysis)
- **Per session**: ~$1.50-3.00 depending on research depth
- **Full 32 sections**: ~$50-100 total
- Worth it for comprehensive, evidence-based recommendations

## Development Notes

This is a **second-generation harness** building on lessons from the PRD Generation Harness (V1).

### Key Improvements
1. **Read + Update workflow**: Can modify original PRDs (new security permission)
2. **Research-intensive**: 5+ websites via Puppeteer (V1 only used Archon RAG)
3. **Critical thinking**: Devil's advocate analysis, not just documentation
4. **Build vs Buy framework**: Evaluates AI-powered custom builds as viable option

### Learnings Applied
- Prompt engineering is 80% of the work (intelligence lives in prompts, not Python)
- One task per session prevents context exhaustion
- Explicit > Implicit ("5+ websites" not "thorough research")
- State management via Archon (don't maintain complex state in Python)

## Next Steps

After completing all 32 sections:
1. Review all analyses in `../docs/modernization-analysis/`
2. Identify cross-cutting themes
3. Prioritize recommendations by ROI
4. Build implementation roadmap
5. Present findings to team

## Contact / Questions

- Built with: [Claude Agent SDK](https://github.com/anthropics/agent-sdk)
- Archon: [Archon Documentation](https://archon.dev)
- Issues: Check `../docs/modernization-analysis/` for session logs

---

*This harness demonstrates the power of autonomous agents for code analysis and architectural review.*
