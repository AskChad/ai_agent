# Vercel Deployment Guide

## Current Deployment

**URL:** https://ai-agent-beta-ten.vercel.app/

## Status

✅ **Code pushed to GitHub:** Latest changes committed and pushed
⏳ **Deployment:** In progress (Vercel will auto-deploy from GitHub)

## GitHub Integration

Your Vercel project is connected to GitHub and will automatically deploy when you push to the `main` branch.

To check deployment status:
1. Go to https://vercel.com/dashboard
2. Find the "ai-agent" project
3. Check the "Deployments" tab

## Environment Variables Setup

### Required Environment Variables for Production

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mdccswzjwfyrzahbhduu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzMzMzYsImV4cCI6MjA3Nzk0OTMzNn0.WV8tu4fnr-qHN9-83Y29Ly88GQFb5zMIRCzQg_sDdlg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY2Nzd3pqd2Z5cnphaGJoZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MzMzNiwiZXhwIjoyMDc3OTQ5MzM2fQ.WhkvI7y3q3-KpRH94FUDWEJ2Wv-AS7xHAUs8ATvAmTE
DB_PASSWORD=AiChatAgent2024!Secure#DB

# Application
NEXT_PUBLIC_APP_URL=https://ai-agent-beta-ten.vercel.app
NODE_ENV=production

# GoHighLevel (fill these in when ready)
GHL_CLIENT_ID=your_client_id_here
GHL_CLIENT_SECRET=your_client_secret_here
GHL_REDIRECT_URI=https://ai-agent-beta-ten.vercel.app/api/ghl/oauth/callback
GHL_CONVERSATION_PROVIDER_ID=your_provider_id_here

# AI Providers (optional for now)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Steps to Add Environment Variables:

1. Go to https://vercel.com/dashboard
2. Select your "ai-agent" project
3. Click "Settings" in the top menu
4. Click "Environment Variables" in the left sidebar
5. Add each variable above:
   - **Key:** Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value:** The value from above
   - **Environment:** Select "Production", "Preview", and "Development"
6. Click "Save"

After adding environment variables, redeploy:
- Go to "Deployments" tab
- Click the three dots (•••) on the latest deployment
- Click "Redeploy"

## Manual Deployment (Alternative)

If you need to manually deploy:

### Option 1: Push to GitHub
```bash
git add .
git commit -m "Your changes"
git push
```
Vercel will automatically deploy.

### Option 2: Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## Deployment Checklist

- [x] Updated landing page
- [x] Pushed to GitHub
- [ ] Verify deployment completed (check Vercel dashboard)
- [ ] Add environment variables in Vercel
- [ ] Test production deployment
- [ ] Verify database connection works
- [ ] Test authentication flows
- [ ] Test GoHighLevel OAuth (after adding env vars)

## Custom Domain (Optional)

To add a custom domain:

1. Go to Project → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `chatbot.yourdomain.com`)
4. Follow DNS configuration instructions
5. Update these environment variables:
   - `NEXT_PUBLIC_APP_URL=https://chatbot.yourdomain.com`
   - `GHL_REDIRECT_URI=https://chatbot.yourdomain.com/api/ghl/oauth/callback`

## Troubleshooting

### Deployment Not Updating

1. Check GitHub connection:
   - Vercel Dashboard → Project → Settings → Git
   - Ensure "Production Branch" is set to `main`

2. Check build logs:
   - Go to Deployments tab
   - Click on latest deployment
   - Check "Building" and "Functions" logs for errors

3. Clear cache and redeploy:
   - Deployments → Three dots → Redeploy
   - Check "Clear Cache"

### Environment Variables Not Working

- Ensure variables are added to all environments (Production, Preview, Development)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)
- Don't include quotes in Vercel UI (they're added automatically)

### Build Errors

Common issues:
- Missing dependencies: Check `package.json`
- TypeScript errors: Run `npm run build` locally first
- Environment variables: Add all required vars in Vercel

### 404 Errors

- Check that files exist in repository
- Verify Next.js routing is correct
- Check `next.config.js` for any custom routing

## Performance Optimization

Vercel automatically:
- ✅ Caches static assets
- ✅ Optimizes images with Next.js Image
- ✅ Enables edge caching
- ✅ Compresses responses
- ✅ Serves from global CDN

## Monitoring

Access deployment analytics:
- Vercel Dashboard → Project → Analytics
- Monitor:
  - Page views
  - Request timing
  - Error rates
  - Geographic distribution

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Project GitHub: https://github.com/AskChad/AI_Agent

---

**Last Updated:** 2025-11-06
**Deployment Status:** Pushed to GitHub, awaiting auto-deployment
