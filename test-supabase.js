import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.production');
  process.exit(1);
}

console.log('🔍 Testing Supabase connection...');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Check if we can connect
    console.log('\n1️⃣ Testing basic connection...');
    const { data: test, error: testError } = await supabase
      .from('sessions')
      .select('count')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('relation "public.sessions" does not exist')) {
        console.log('⚠️  Tables not created yet. Please run supabase-setup.sql first.');
      } else {
        console.error('❌ Connection error:', testError.message);
      }
    } else {
      console.log('✅ Successfully connected to Supabase!');
    }

    // Test 2: Try to insert a test session
    console.log('\n2️⃣ Testing write operations...');
    const testSessionId = `test-${Date.now()}`;
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        id: testSessionId,
        title: 'Test Session',
        metadata: { test: true }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Write error:', sessionError.message);
    } else {
      console.log('✅ Successfully created test session:', session.id);
      
      // Clean up
      await supabase.from('sessions').delete().eq('id', testSessionId);
      console.log('🧹 Cleaned up test data');
    }

    // Test 3: Check table existence
    console.log('\n3️⃣ Checking tables...');
    const tables = [
      'messages', 'executions', 'tool_usage', 'sessions',
      'searches', 'browser_actions', 'memory_operations',
      'files', 'tasks', 'api_usage'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error && error.message.includes('does not exist')) {
        console.log(`❌ Table '${table}' not found`);
      } else if (error) {
        console.log(`⚠️  Table '${table}' error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }

    console.log('\n✨ Supabase setup verification complete!');
    console.log('\nNext steps:');
    console.log('1. If tables are missing, run the SQL setup script');
    console.log('2. Get your service role key from Supabase dashboard');
    console.log('3. Update DATABASE_URL with your database password');
    console.log('4. Run deployment: ./deploy-vercel.sh');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();