# Supabase Setup Guide for Lemon AI

This guide will help you set up your Supabase database for the Lemon AI cloud deployment.

## Your Supabase Instance

- **Project URL**: https://nsraqecjagokdjxxmzsp.supabase.co
- **Anon Key**: Already configured in `.env.production`

## Step 1: Get Your Database Password

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/settings/database)
2. Navigate to Settings → Database
3. Copy your database password
4. Update the `.env.production` file with your password:
   ```
   DATABASE_URL=postgres://postgres.nsraqecjagokdjxxmzsp:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

## Step 2: Run Database Setup

1. Go to the [SQL Editor](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/sql/new)
2. Copy the entire contents of `supabase-setup.sql`
3. Paste and run the SQL script
4. You should see "Supabase setup completed successfully!" message

## Step 3: Get Service Role Key

1. Go to [API Settings](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/settings/api)
2. Copy the `service_role` key (under "Project API keys")
3. Update `.env.production`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Step 4: Enable Realtime (Optional)

For real-time features:

1. Go to [Database → Replication](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/database/replication)
2. Enable replication for these tables:
   - messages
   - executions
   - tasks

## Step 5: Configure Storage (Optional)

For file uploads:

1. Go to [Storage](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/storage/buckets)
2. Create a new bucket called `workspace`
3. Set it to public or configure RLS policies

## Database Schema Overview

The setup creates these tables:

- **messages** - Chat history with AI
- **executions** - Code execution logs
- **tool_usage** - MCP tool usage tracking
- **sessions** - User sessions
- **searches** - Web search history
- **browser_actions** - Browser automation logs
- **memory_operations** - Mem0 memory storage
- **files** - Workspace file management
- **tasks** - Agent task tracking
- **api_usage** - API usage and billing

## Useful Queries

### View Recent Activity
```sql
SELECT * FROM messages 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Session Summary
```sql
SELECT * FROM get_session_summary('your-session-id');
```

### API Usage Stats
```sql
SELECT 
  endpoint,
  COUNT(*) as calls,
  AVG(response_time_ms) as avg_response_time,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost
FROM api_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY endpoint
ORDER BY calls DESC;
```

## Security Notes

1. **Never expose your service role key** in frontend code
2. **Enable RLS** on all tables (already done in setup)
3. **Use environment variables** for all sensitive data
4. **Rotate keys regularly** from the Supabase dashboard

## Monitoring

1. Check [Database Health](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/reports/database)
2. Monitor [API Usage](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/reports/api-overview)
3. Set up [Alerts](https://supabase.com/dashboard/project/nsraqecjagokdjxxmzsp/reports/alerts)

## Troubleshooting

### Connection Issues
- Ensure you're using the connection pooler URL for serverless
- Check if your IP is allowed in database settings
- Verify SSL mode is set to 'require'

### Performance
- Add indexes for frequently queried columns
- Use connection pooling for serverless functions
- Enable query performance insights

### Storage
- Check bucket permissions
- Verify CORS settings for frontend uploads
- Monitor storage usage in dashboard

## Support

- [Supabase Docs](https://supabase.com/docs)
- [Discord Community](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)