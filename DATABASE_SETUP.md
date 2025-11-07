# Database Setup Guide

## Two-Step Deployment Process

### Step 1: Install exec_sql Function (Required First)

The `exec_sql` function enables SQL execution via API, making future migrations easier.

#### Option A: Supabase Dashboard (Recommended - Always Works)

1. Go to: https://supabase.com/dashboard/project/mdccswzjwfyrzahbhduu/sql
2. Click "New Query"
3. Copy and paste contents of: `database/migrations/000_install_exec_sql.sql`
4. Click "Run"
5. You should see "exec_sql installed successfully!" in the results

#### Option B: Automated Script (Windows PowerShell)

```powershell
cd C:\development\Ai_Agent
.\scripts\install-exec-sql-windows.ps1
```

#### Option C: Node.js (WSL/Linux/Mac)

```bash
node scripts/install-exec-sql.js
```

---

### Step 2: Run Multi-Agent Migration

Once `exec_sql` is installed, run the multi-agent architecture migration.

#### Option A: Using exec_sql via API (IPv4 - Automated)

```bash
node scripts/run-migration-ipv4.js
```

This script:
- Uses IPv4 explicitly for connectivity
- Calls exec_sql function via Supabase REST API
- Runs the migration remotely
- Verifies the deployment

#### Option B: Supabase Dashboard (Manual)

1. Go to: https://supabase.com/dashboard/project/mdccswzjwfyrzahbhduu/sql
2. Click "New Query"
3. Copy and paste contents of: `database/migrations/005_multi_agent_SIMPLE.sql`
4. Click "Run"
5. Check verification results

---

## What Gets Deployed

### Step 1 - exec_sql Function
- PostgreSQL function that accepts SQL queries
- Enables remote SQL execution via REST API
- Granted to service_role, authenticated, and anon roles

### Step 2 - Multi-Agent Architecture
- **agents table**: Stores AI agent configurations
  - AI provider (OpenAI, Anthropic)
  - Model selection
  - System prompts
  - Context window settings
  - Function calling toggle
  - Status management (active, paused, archived)

- **Account limits**:
  - `max_agents` column (0 = unlimited, number = limit)
  - `is_platform_admin` column for admin controls

- **Foreign keys**: Links to existing tables
  - conversations → agents
  - functions → agents
  - knowledge_base → agents
  - ghl_integrations → agents

- **Default agents**: Automatically created for existing accounts

- **Data migration**: All existing records linked to default agents

---

## Verification

After both steps, run this query in Supabase SQL Editor:

```sql
SELECT
  'Deployment complete!' as status,
  (SELECT COUNT(*) FROM agents) as total_agents,
  (SELECT COUNT(DISTINCT account_id) FROM agents) as accounts_with_agents,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name='accounts' AND column_name='max_agents') as accounts_updated,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_name='exec_sql') as exec_sql_exists;
```

Expected results:
- `exec_sql_exists`: 1 or more
- `accounts_updated`: 1
- `total_agents`: At least 1 (one per account)
- `accounts_with_agents`: At least 1

---

## Troubleshooting

### "exec_sql function not found"
- You need to complete Step 1 first
- Verify by running: `SELECT * FROM information_schema.routines WHERE routine_name = 'exec_sql'`

### "Connection refused" or "ENETUNREACH"
- Use Option A (Supabase Dashboard) for both steps
- Network/firewall may be blocking direct PostgreSQL connections
- Dashboard always works as it uses HTTPS

### "Permission denied"
- Make sure you're using the SERVICE_ROLE_KEY, not anon key
- Check environment variable: `echo $SUPABASE_SERVICE_ROLE_KEY`

### Need to re-run migration?
- All migrations are idempotent (safe to run multiple times)
- Uses `IF NOT EXISTS` checks
- Won't duplicate data

---

## Environment Variables

Set these for automated scripts:

```bash
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE"
```

Or in PowerShell:
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE"
```

---

## Next Steps

After successful deployment:

1. **Visit the Agents page**: https://ai-agent-beta-ten.vercel.app/dashboard/agents
2. **Create additional agents** with different configurations
3. **Set agent limits** (Platform admins only)
4. **Assign agents** to conversations, functions, and integrations

---

## Quick Reference

| File | Purpose |
|------|---------|
| `database/migrations/000_install_exec_sql.sql` | Install exec_sql function |
| `database/migrations/005_multi_agent_SIMPLE.sql` | Multi-agent migration |
| `database/migrations/006_complete_deployment.sql` | Both steps combined |
| `scripts/install-exec-sql.js` | Automated exec_sql installer |
| `scripts/install-exec-sql-windows.ps1` | Windows PowerShell installer |
| `scripts/run-migration-ipv4.js` | Run migration via exec_sql (IPv4) |
