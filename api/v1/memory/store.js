import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mem0 API configuration
const MEM0_API_URL = 'https://api.mem0.ai/v1';

async function mem0Request(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.MEM0_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${MEM0_API_URL}${endpoint}`, options);
  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action, userId, sessionId } = req.body;

    let result;

    switch (action) {
      case 'add':
        // Add memory
        const { messages, metadata } = req.body;
        result = await mem0Request('/memories', 'POST', {
          messages,
          user_id: userId,
          metadata: {
            ...metadata,
            session_id: sessionId,
            timestamp: new Date().toISOString()
          }
        });
        break;

      case 'search':
        // Search memories
        const { query, limit = 10 } = req.body;
        result = await mem0Request(`/memories/search?query=${encodeURIComponent(query)}&user_id=${userId}&limit=${limit}`);
        break;

      case 'get':
        // Get specific memory
        const { memoryId } = req.body;
        result = await mem0Request(`/memories/${memoryId}`);
        break;

      case 'update':
        // Update memory
        const { memoryId: updateId, data } = req.body;
        result = await mem0Request(`/memories/${updateId}`, 'PUT', data);
        break;

      case 'delete':
        // Delete memory
        const { memoryId: deleteId } = req.body;
        result = await mem0Request(`/memories/${deleteId}`, 'DELETE');
        break;

      case 'list':
        // List all memories for user
        result = await mem0Request(`/memories?user_id=${userId}`);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log to Supabase for analytics
    if (sessionId) {
      await supabase.from('memory_operations').insert({
        session_id: sessionId,
        user_id: userId,
        action,
        result: result.success ? 'success' : 'failed',
        created_at: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Memory operation error:', error);
    res.status(500).json({
      error: 'Failed to execute memory operation',
      details: error.message
    });
  }
}