# Deploying Lemon AI to Vercel with Cloud Services

This guide walks you through deploying Lemon AI on Vercel with cloud-based LLMs, secure code execution via E2B, and cloud MCP servers.

## Prerequisites

1. [Vercel Account](https://vercel.com)
2. [Supabase Account](https://supabase.com) for database
3. [E2B Account](https://e2b.dev) for secure code execution
4. API keys for LLM providers (OpenAI, Anthropic, Google, etc.)

## Step 1: Set Up Supabase Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run these commands:

```sql
-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Executions table
CREATE TABLE executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT,
  output TEXT,
  error TEXT,
  exit_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool usage table
CREATE TABLE tool_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  server TEXT NOT NULL,
  tool TEXT NOT NULL,
  arguments JSONB,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_executions_session ON executions(session_id);
CREATE INDEX idx_tool_usage_session ON tool_usage(session_id);

-- Additional tables for cloud services
CREATE TABLE searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  provider TEXT NOT NULL,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE browser_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  parameters JSONB,
  result JSONB,
  browser_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE memory_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for new tables
CREATE INDEX idx_searches_session ON searches(session_id);
CREATE INDEX idx_browser_actions_session ON browser_actions(session_id);
CREATE INDEX idx_memory_operations_session ON memory_operations(session_id);
```

3. Copy your Supabase URL and anon key from Settings > API

## Step 2: Set Up E2B for Code Execution

1. Sign up at [e2b.dev](https://e2b.dev)
2. Create an API key from your dashboard
3. (Optional) Create custom templates for specific environments

## Step 3: Quick Deployment

### Option 1: Automated Deployment
```bash
# Use the deployment script
./deploy-vercel.sh
```

### Option 2: Manual Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Copy `.env.production` file with your API keys
3. Run `vercel` and follow prompts
4. Set environment variables in Vercel dashboard

## Step 4: Configure Environment Variables

The `.env.production` file contains all necessary variables:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# E2B
E2B_API_KEY=your_e2b_api_key
E2B_TEMPLATE_PYTHON=python  # or your custom template ID
E2B_TEMPLATE_NODEJS=nodejs
E2B_TEMPLATE_GENERAL=base

# LLM Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key  # optional
XAI_API_KEY=your_xai_key    # optional

# MCP Servers (optional)
GITHUB_TOKEN=your_github_token
GITLAB_TOKEN=your_gitlab_token
DATABASE_URL=your_postgres_url

# Vercel
VITE_API_BASE_URL=https://your-project.vercel.app
VITE_CLOUD_MODE=true
```

## Step 4: Update Frontend Configuration

1. Update `frontend/vite.config.js` to handle environment variables:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
    'process.env.VITE_CLOUD_MODE': JSON.stringify(process.env.VITE_CLOUD_MODE || 'false')
  }
})
```

2. Update `frontend/src/services/api.js` to use cloud endpoints:

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const IS_CLOUD = import.meta.env.VITE_CLOUD_MODE === 'true'

export const api = {
  // Use Vercel serverless functions in cloud mode
  baseURL: IS_CLOUD ? '/api' : API_BASE + '/api',
  
  async sendMessage(message, sessionId, provider = 'openai') {
    return fetch(`${this.baseURL}/v1/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, provider })
    })
  },
  
  async executeCode(code, language, sessionId) {
    return fetch(`${this.baseURL}/v1/runtime/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, sessionId })
    })
  },
  
  async useTool(server, tool, arguments, sessionId) {
    return fetch(`${this.baseURL}/v1/mcp/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server, tool, arguments, sessionId })
    })
  }
}
```

## Step 5: Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy the project:
```bash
vercel
```

3. Set environment variables in Vercel Dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add all variables from `.env.local`

4. Redeploy to apply environment variables:
```bash
vercel --prod
```

## Step 6: Configure Custom Domain (Optional)

1. In Vercel Dashboard, go to Domains
2. Add your custom domain
3. Update DNS records as instructed

## Cloud Services Architecture

### LLM Providers
- **OpenAI**: GPT-4, GPT-3.5
- **Anthropic**: Claude 3 (Opus, Sonnet, Haiku)
- **Google**: Gemini Pro, Gemini Ultra
- **Others**: Groq, xAI Grok

### Code Execution (E2B)
- Secure sandboxed environments
- Support for Python, Node.js, Shell
- File system access within sandbox
- 60-second timeout (configurable)

### MCP Servers
- Filesystem operations
- GitHub/GitLab integration
- Database queries
- Web scraping with Puppeteer

### Database (Supabase)
- PostgreSQL database
- Real-time subscriptions
- Row-level security
- Built-in auth (optional)

## Monitoring and Logs

1. **Vercel Logs**: Check function logs in Vercel Dashboard
2. **Supabase Logs**: Monitor database queries in Supabase Dashboard
3. **E2B Dashboard**: View code execution metrics

## Cost Optimization

1. **Vercel**: 
   - Use Edge Functions for lighter endpoints
   - Implement caching for repeated requests
   - Set appropriate function timeouts

2. **LLMs**:
   - Use cheaper models for simple tasks
   - Implement response caching
   - Set token limits

3. **E2B**:
   - Reuse sandboxes when possible
   - Set appropriate timeouts
   - Clean up resources after use

## Security Best Practices

1. **API Keys**: Never expose keys in frontend code
2. **CORS**: Configure proper CORS headers
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: Validate all user inputs
5. **Supabase RLS**: Enable Row Level Security

## Troubleshooting

### Common Issues

1. **Function Timeout**: Increase `maxDuration` in vercel.json
2. **CORS Errors**: Check API endpoint configurations
3. **Database Connection**: Verify Supabase credentials
4. **E2B Errors**: Check API key and quota limits

### Debug Mode

Add these to your environment variables:
```bash
DEBUG=true
LOG_LEVEL=debug
```

## Next Steps

1. Set up monitoring with Vercel Analytics
2. Implement user authentication with Supabase Auth
3. Add more MCP servers for extended functionality
4. Set up CI/CD with GitHub Actions
5. Implement webhook endpoints for real-time updates