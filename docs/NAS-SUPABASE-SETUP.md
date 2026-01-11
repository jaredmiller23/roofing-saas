# Self-Hosted Supabase Setup Guide
## UGREEN NASync DXP480T Plus

**Generated**: January 11, 2026
**Purpose**: Set up Supabase for Roofing SaaS on local NAS

---

## Prerequisites

- SSH access to your NAS (or use UGOS Pro terminal)
- Docker and Docker Compose installed (should be pre-installed on UGOS Pro)
- Static IP assigned to NAS (recommended)

---

## Step 1: Access NAS Terminal

**Option A: SSH**
```bash
ssh admin@<your-nas-ip>
```

**Option B: UGOS Pro Web UI**
- Open UGOS Pro dashboard
- Look for Terminal or SSH app

---

## Step 2: Verify Docker

```bash
docker --version
docker compose version
```

If not installed, install via UGOS Pro app store or package manager.

---

## Step 3: Create Directory Structure

```bash
# Create supabase directory
mkdir -p /volume1/docker/supabase
cd /volume1/docker/supabase

# Create subdirectories for persistent data
mkdir -p volumes/db/data
mkdir -p volumes/storage
mkdir -p volumes/backups
mkdir -p scripts
```

---

## Step 4: Clone Supabase Self-Hosted

```bash
cd /volume1/docker/supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

---

## Step 5: Configure Environment

```bash
# Copy example env file
cp .env.example .env
```

**Edit the `.env` file with these values:**

```bash
nano .env
# Or use: vi .env
```

### Required Changes in .env:

```env
############
# Secrets - REPLACE THESE WITH THE VALUES BELOW
############

# Database
POSTGRES_PASSWORD=1f5qkVRx6SNVEh1VFVW6H1o3lvtjjPY

# JWT - Used to sign tokens
JWT_SECRET=u8oc6WJuDyiy5f0NuAd97MB48GekPs7Y29yEY6NL6XA6mNN5Eg8uB6SCETemlY
JWT_EXPIRY=3600

############
# API Keys - Generate these using Step 6 below
############
ANON_KEY=<generate-in-step-6>
SERVICE_ROLE_KEY=<generate-in-step-6>

############
# URLs - Replace with your NAS IP
############
SITE_URL=http://<YOUR-NAS-IP>:3000
API_EXTERNAL_URL=http://<YOUR-NAS-IP>:8000
SUPABASE_PUBLIC_URL=http://<YOUR-NAS-IP>:8000

############
# Studio
############
STUDIO_PORT=3000
STUDIO_DEFAULT_ORGANIZATION=Clarity AI
STUDIO_DEFAULT_PROJECT=Roofing SaaS

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# Storage
############
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800
```

---

## Step 6: Generate API Keys

The ANON_KEY and SERVICE_ROLE_KEY must be valid JWTs signed with your JWT_SECRET.

**Option A: Use Supabase Key Generator (Easiest)**

Visit: https://supabase.com/docs/guides/self-hosting#api-keys

Enter your JWT_SECRET and it will generate the keys.

**Option B: Generate via Command Line**

```bash
# Install jwt-cli if available, or use this Node.js script:

cat > /tmp/generate-keys.js << 'EOF'
const crypto = require('crypto');

const JWT_SECRET = 'u8oc6WJuDyiy5f0NuAd97MB48GekPs7Y29yEY6NL6XA6mNN5Eg8uB6SCETemlY';

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const segments = [
    base64url(JSON.stringify(header)),
    base64url(JSON.stringify(payload))
  ];
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(segments.join('.'))
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return [...segments, signature].join('.');
}

const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

console.log('ANON_KEY=' + createJWT(anonPayload));
console.log('');
console.log('SERVICE_ROLE_KEY=' + createJWT(servicePayload));
EOF

node /tmp/generate-keys.js
```

Copy the output and paste into your `.env` file.

---

## Step 7: Update docker-compose.yml for Persistent Storage

Edit `docker-compose.yml` to use your volume paths:

```bash
nano docker-compose.yml
```

Find the `db` service and update the volume:

```yaml
services:
  db:
    # ... other config ...
    volumes:
      - /volume1/docker/supabase/volumes/db/data:/var/lib/postgresql/data:Z
```

Find the `storage` service and update:

```yaml
  storage:
    # ... other config ...
    volumes:
      - /volume1/docker/supabase/volumes/storage:/var/lib/storage:z
```

---

## Step 8: Start Supabase

```bash
# Pull images first (may take a few minutes)
docker compose pull

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs (useful for troubleshooting)
docker compose logs -f
```

---

## Step 9: Verify Installation

### Check all containers are running:
```bash
docker compose ps
```

All services should show "Up" status.

### Test API endpoint:
```bash
curl http://localhost:8000/rest/v1/
```

### Test Auth endpoint:
```bash
curl http://localhost:8000/auth/v1/health
```

### Access Studio (Web UI):
Open in browser: `http://<YOUR-NAS-IP>:3000`

---

## Step 10: Create Backup Script

```bash
cat > /volume1/docker/supabase/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/volume1/docker/supabase/volumes/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker exec supabase-db pg_dump -U postgres -Fc postgres > "$BACKUP_DIR/db_$DATE.dump"

# Keep only last 7 days
find "$BACKUP_DIR" -name "db_*.dump" -mtime +7 -delete

echo "Backup completed: db_$DATE.dump"
EOF

chmod +x /volume1/docker/supabase/scripts/backup.sh
```

---

## Ports Used

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Studio | Web admin dashboard |
| 8000 | Kong | API Gateway (main endpoint) |
| 5432 | PostgreSQL | Database (internal) |

---

## Troubleshooting

### Container won't start
```bash
docker compose logs <service-name>
# e.g., docker compose logs db
```

### Out of memory
```bash
docker stats
# Watch memory usage - if consistently >80%, consider RAM upgrade
```

### Permission denied on volumes
```bash
sudo chown -R 1000:1000 /volume1/docker/supabase/volumes/
```

### Reset everything and start fresh
```bash
docker compose down -v
rm -rf /volume1/docker/supabase/volumes/db/data/*
docker compose up -d
```

---

## Next Steps After Installation

Once Supabase is running:
1. Access Studio at `http://<NAS-IP>:3000`
2. Return here and we'll apply the schema from Roofing SaaS
3. Set up SSL/remote access (Cloudflare Tunnel recommended)
4. Update Vercel environment variables

---

## Your Generated Credentials

**Save these securely!**

```env
POSTGRES_PASSWORD=1f5qkVRx6SNVEh1VFVW6H1o3lvtjjPY
JWT_SECRET=u8oc6WJuDyiy5f0NuAd97MB48GekPs7Y29yEY6NL6XA6mNN5Eg8uB6SCETemlY

ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4MTUzNDk2LCJleHAiOjIwODM1MTM0OTZ9.-aUIHLTdg-8ufBfnaP1UGje3PeMsVFHqt9Z48QsJD9Q

SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNTM0OTYsImV4cCI6MjA4MzUxMzQ5Nn0.LrwZtkvBuHPDTNVsBROk8KEdSuJpUVpDVsOmdbSgbSU
```

All keys are ready to use - just copy into your `.env` file.
