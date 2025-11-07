# Security Notice

## Database Credentials Exposure

**Date:** November 7, 2025

### Issue
Database credentials were temporarily exposed in the Git repository history in the following commits:
- `635c141` - Add multi-agent architecture migration and setup scripts

### Actions Taken
1. ✅ Removed all hardcoded credentials from scripts
2. ✅ Updated all scripts to use environment variables only
3. ✅ Added this security notice

### Required Actions
⚠️ **IMPORTANT:** You must rotate your database credentials immediately:

1. **Generate new Supabase database password:**
   - Go to your Supabase project settings
   - Navigate to Database → Connection Pooling
   - Reset the database password
   - Update the `DATABASE_URL` environment variable in:
     - `.env.local` (local development)
     - Vercel environment variables (production)

2. **Update environment variables:**
   ```bash
   # .env.local
   DATABASE_URL=postgresql://postgres:NEW_PASSWORD@db.iccmkpmujtmvtfpvoxli.supabase.co:5432/postgres
   ```

3. **Update Vercel:**
   ```bash
   vercel env add DATABASE_URL production
   # Paste the new DATABASE_URL when prompted
   ```

### Prevention
All scripts now require the `DATABASE_URL` environment variable. No default passwords are provided.

### Files Updated
- `scripts/run-agent-migration.ts`
- `scripts/deploy-schema-direct.js`
- `scripts/deploy-via-pg.js`

### References
- GitGuardian Detection: November 7, 2025
- Repository: AskChad/ai_agent
- Secret Type: Generic Database Assignment
