-- Supabase Setup SQL for Lemon AI
-- Run this in your Supabase SQL Editor at: https://nsraqecjagokdjxxmzsp.supabase.co

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Messages table for chat history
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code executions table
CREATE TABLE IF NOT EXISTS executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT,
  output TEXT,
  error TEXT,
  exit_code INTEGER,
  execution_time_ms INTEGER,
  sandbox_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool usage tracking
CREATE TABLE IF NOT EXISTS tool_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  server TEXT NOT NULL,
  tool TEXT NOT NULL,
  arguments JSONB,
  result JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions management
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Web searches table
CREATE TABLE IF NOT EXISTS searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  provider TEXT NOT NULL,
  results JSONB,
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Browser automation actions
CREATE TABLE IF NOT EXISTS browser_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  parameters JSONB,
  result JSONB,
  browser_session_id TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory operations for Mem0 integration
CREATE TABLE IF NOT EXISTS memory_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  memory_id TEXT,
  content JSONB,
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files and workspace management
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT,
  size INTEGER,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks tracking for agent workflow
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  priority INTEGER DEFAULT 0,
  parent_task_id UUID REFERENCES tasks(id),
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage and rate limiting
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  api_key_hash TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_executions_session ON executions(session_id);
CREATE INDEX idx_tool_usage_session ON tool_usage(session_id);
CREATE INDEX idx_searches_session ON searches(session_id);
CREATE INDEX idx_browser_actions_session ON browser_actions(session_id);
CREATE INDEX idx_memory_operations_session ON memory_operations(session_id);
CREATE INDEX idx_memory_operations_user ON memory_operations(user_id);
CREATE INDEX idx_files_session ON files(session_id);
CREATE INDEX idx_files_path ON files(path);
CREATE INDEX idx_tasks_session ON tasks(session_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_created ON api_usage(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (adjust based on your auth strategy)
-- For now, allowing all authenticated users to access their own data

-- Example policy for messages (adjust as needed)
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for session analytics
CREATE VIEW session_analytics AS
SELECT 
  s.id,
  s.user_id,
  s.created_at,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT e.id) as execution_count,
  COUNT(DISTINCT t.id) as tool_usage_count,
  COUNT(DISTINCT sr.id) as search_count,
  MAX(m.created_at) as last_activity
FROM sessions s
LEFT JOIN messages m ON m.session_id = s.id
LEFT JOIN executions e ON e.session_id = s.id
LEFT JOIN tool_usage t ON t.session_id = s.id
LEFT JOIN searches sr ON sr.session_id = s.id
GROUP BY s.id, s.user_id, s.created_at;

-- Create a function to get session summary
CREATE OR REPLACE FUNCTION get_session_summary(p_session_id TEXT)
RETURNS TABLE(
  total_messages BIGINT,
  total_executions BIGINT,
  total_searches BIGINT,
  total_browser_actions BIGINT,
  total_memory_ops BIGINT,
  session_duration INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT e.id) as total_executions,
    COUNT(DISTINCT s.id) as total_searches,
    COUNT(DISTINCT b.id) as total_browser_actions,
    COUNT(DISTINCT mo.id) as total_memory_ops,
    MAX(GREATEST(
      m.created_at, 
      e.created_at, 
      s.created_at, 
      b.created_at, 
      mo.created_at
    )) - MIN(LEAST(
      m.created_at, 
      e.created_at, 
      s.created_at, 
      b.created_at, 
      mo.created_at
    )) as session_duration
  FROM sessions sess
  LEFT JOIN messages m ON m.session_id = sess.id
  LEFT JOIN executions e ON e.session_id = sess.id
  LEFT JOIN searches s ON s.session_id = sess.id
  LEFT JOIN browser_actions b ON b.session_id = sess.id
  LEFT JOIN memory_operations mo ON mo.session_id = sess.id
  WHERE sess.id = p_session_id
  GROUP BY sess.id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your needs)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Supabase setup completed successfully!';
  RAISE NOTICE 'Database URL: postgres://postgres.nsraqecjagokdjxxmzsp:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
  RAISE NOTICE 'Remember to get your database password from the Supabase dashboard.';
END $$;