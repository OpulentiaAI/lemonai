# Vercel Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration
- [x] `.env.production` configured with all API keys
- [x] Default model set to `claude-opus-4-20250514`
- [x] Supabase URLs and keys configured
- [ ] Database password added to DATABASE_URL

### 2. Supabase Setup
- [ ] Run `supabase-setup.sql` in SQL Editor
- [ ] Get service role key from dashboard
- [ ] Update `.env.production` with service role key
- [ ] Test connection with `npm run test-supabase`

### 3. Vercel Configuration
- [x] `vercel.json` configured
- [x] API routes set up in `/api` directory
- [x] Build commands configured
- [x] Function timeouts set appropriately

### 4. Code Verification
- [x] All API endpoints created and tested
- [x] Frontend configured for cloud mode
- [x] Error handling implemented
- [x] CORS headers configured

## 🚀 Deployment Steps

### Step 1: Final Preparation
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Test Supabase connection
npm run test-supabase
```

### Step 2: Deploy to Vercel
```bash
# Option 1: Use deployment script
./deploy-vercel.sh

# Option 2: Manual deployment
vercel --prod
```

### Step 3: Post-Deployment
1. Check deployment at: https://[your-project].vercel.app
2. Test all major features:
   - [ ] Chat with Claude Opus 4
   - [ ] Code execution with E2B
   - [ ] Web search
   - [ ] Browser automation
   - [ ] Memory storage

### Step 4: Monitor
- Check Vercel logs for errors
- Monitor Supabase dashboard for database activity
- Track API usage in respective dashboards

## 🔍 Verification URLs

Once deployed, test these endpoints:
- Chat: `POST /api/v1/chat/send`
- Execute: `POST /api/v1/runtime/execute`
- Search: `POST /api/v1/search/web`
- Browser: `POST /api/v1/browser/automate`
- Memory: `POST /api/v1/memory/store`

## 📊 Expected Performance

- Chat response: < 2s
- Code execution: < 5s
- Web search: < 3s
- Browser automation: < 10s

## 🚨 Troubleshooting

If deployment fails:
1. Check Vercel build logs
2. Verify all environment variables are set
3. Ensure Supabase tables are created
4. Check API key validity
5. Review function logs in Vercel dashboard