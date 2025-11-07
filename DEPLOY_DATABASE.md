# Database Deployment Instructions

## Multi-Agent Architecture + exec_sql Function

The database schema is ready to deploy. Here are your options:

---

## ✅ OPTION 1: Supabase Dashboard (Easiest - Recommended)

1. Open: https://supabase.com/dashboard/project/mdccswzjwfyrzahbhduu/sql
2. Click "New Query"
3. Copy and paste the contents of: `/tmp/complete-deployment.sql`
4. Click "Run"
5. You should see a verification message showing deployment success

**This is the recommended approach** - it's the most reliable and requires no local setup.

---

## ✅ OPTION 2: Windows PowerShell with Node.js

From Windows PowerShell (not WSL), run:

```powershell
cd C:\development\Ai_Agent
node C:\Users\<YourUsername>\AppData\Local\Temp\deploy-ipv4.js
```

Or create a new file `deploy-windows.js` in your project root:

```javascript
const { Client } = require('pg');
const fs = require('fs');

const config = {
  host: 'db.mdccswzjwfyrzahbhduu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ssl: { rejectUnauthorized: false },
};

async function deploy() {
  const client = new Client(config);
  await client.connect();

  console.log('Creating exec_sql function...');
  const createFunc = fs.readFileSync('C:\\Users\\<YourUsername>\\AppData\\Local\\Temp\\create-exec-sql-function.sql', 'utf8');
  await client.query(createFunc);

  console.log('Running migration...');
  const migration = fs.readFileSync('./database/migrations/005_multi_agent_SIMPLE.sql', 'utf8');
  await client.query(migration);

  console.log('✅ Deployment complete!');
  await client.end();
}

deploy().catch(console.error);
```

Then run:
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE"
node deploy-windows.js
```

---

## ✅ OPTION 3: PostgreSQL Client (psql)

If you have PostgreSQL installed on Windows:

```powershell
$env:PGPASSWORD="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE"

psql -h db.mdccswzjwfyrzahbhduu.supabase.co -p 5432 -U postgres -d postgres -f C:\Users\<YourUsername>\AppData\Local\Temp\complete-deployment.sql
```

---

## 📄 Files Required

All necessary SQL files are located at:
- `/tmp/complete-deployment.sql` - Complete deployment (exec_sql + migration)
- `/tmp/create-exec-sql-function.sql` - Just the exec_sql function
- `/mnt/c/development/Ai_Agent/database/migrations/005_multi_agent_SIMPLE.sql` - Just the migration

---

## ✅ What Gets Deployed

1. **exec_sql function** - Allows future SQL execution via API
2. **agents table** - Stores AI agent configurations
3. **Agent limits** - max_agents and is_platform_admin columns in accounts
4. **Foreign keys** - Links conversations, functions, knowledge_base, ghl_integrations to agents
5. **Default agents** - Creates "Default Agent" for all existing accounts
6. **Data migration** - Links all existing data to default agents

---

## 🔍 Verification

After deployment, run this in Supabase SQL Editor to verify:

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
- `accounts_updated`: 1
- `exec_sql_exists`: 1 or more
- `total_agents`: At least 1 (number of accounts)
- `accounts_with_agents`: At least 1

---

## 🎯 Recommendation

**Use Option 1 (Supabase Dashboard)** - it's the fastest and most reliable method.
