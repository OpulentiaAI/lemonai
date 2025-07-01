import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Search providers configuration
const searchProviders = {
  tavily: async (query) => {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.TAVILY_API_KEY
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_images: true,
        include_answer: true,
        max_results: 10
      })
    });
    return response.json();
  },

  perplexity: async (query) => {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'pplx-7b-online',
        messages: [{ role: 'user', content: query }],
        stream: false
      })
    });
    return response.json();
  },

  jina: async (query) => {
    const response = await fetch(`https://r.jina.ai/${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    return response.json();
  },

  exa: async (query) => {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.EXA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        numResults: 10,
        useAutoprompt: true
      })
    });
    return response.json();
  },

  serpapi: async (query) => {
    const params = new URLSearchParams({
      api_key: process.env.SERPAPI_API_KEY,
      q: query,
      engine: 'google',
      num: '10'
    });
    const response = await fetch(`https://serpapi.com/search?${params}`);
    return response.json();
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, provider = 'tavily', sessionId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Execute search
    const searchFunction = searchProviders[provider];
    if (!searchFunction) {
      return res.status(400).json({ error: `Unknown search provider: ${provider}` });
    }

    const results = await searchFunction(query);

    // Log search to database
    if (sessionId) {
      await supabase.from('searches').insert({
        session_id: sessionId,
        query,
        provider,
        results,
        created_at: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      provider,
      results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Failed to execute search',
      details: error.message
    });
  }
}