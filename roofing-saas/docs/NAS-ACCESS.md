# NAS Access Documentation

## Connection Details

| Property | Value |
|----------|-------|
| Hostname | JBNAS |
| IP Address | 192.168.51.159 |
| User | JBMiller |
| SSH Auth | Key-based (ed25519) |

## SSH Access

From this machine:
```bash
ssh JBMiller@192.168.51.159
```

SSH key is stored at `~/.ssh/id_ed25519` and is authorized on the NAS.

## Supabase Location

```
/volume2/clarityAiNet/supabase/supabase/docker/
```

Key files:
- `.env` - Environment configuration (SMTP, URLs, etc.)
- `docker-compose.yml` - Service definitions

## Docker Commands

```bash
# View running containers
sudo docker ps

# Restart auth service (after .env changes)
cd /volume2/clarityAiNet/supabase/supabase/docker
sudo docker compose up -d auth

# View auth logs
sudo docker logs supabase-auth --tail 50

# Restart all Supabase services
cd /volume2/clarityAiNet/supabase/supabase/docker
sudo docker compose down && sudo docker compose up -d
```

## SMTP Configuration

Current config in `.env`:
```env
SMTP_ADMIN_EMAIL=noreply@mail.jobclarity.io
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_B5o9op3J_GQfNLJHveBx2BeKHhuk8giUo
SMTP_SENDER_NAME=Roofing SaaS
```

**Status: WORKING** (verified 2026-01-12)

## URL Configuration

```env
SITE_URL=https://roofing-saas.vercel.app
API_EXTERNAL_URL=https://api.jobclarity.io
```

## Resend Domain Verification

Domain: `mail.jobclarity.io` (subdomain)
Domain ID: `530b942b-f374-458f-9e24-73e94cc2e4b9`
Status: **VERIFIED**

Check status:
```bash
curl -s "https://api.resend.com/domains/530b942b-f374-458f-9e24-73e94cc2e4b9" \
  -H "Authorization: Bearer re_B5o9op3J_GQfNLJHveBx2BeKHhuk8giUo" | jq '.status'
```

DNS Records (in Cloudflare for jobclarity.io):
- TXT `resend._domainkey.mail` - DKIM key
- MX `send.mail` - feedback-smtp.us-east-1.amazonses.com (priority 10)
- TXT `send.mail` - v=spf1 include:amazonses.com ~all

## Sudo Access

JBMiller has passwordless sudo for docker commands:
```
/etc/sudoers.d/jbmiller-docker
```

---

*Last updated: 2026-01-12*
