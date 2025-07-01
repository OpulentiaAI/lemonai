import { VercelRequest, VercelResponse } from '@vercel/node';

// Define available platforms
const PLATFORMS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    enabled: true,
    api_url: 'https://api.anthropic.com',
    description: 'Claude models',
    logo: '/images/anthropic.png',
    models_count: 2
  },
  {
    id: 'openai',
    name: 'OpenAI',
    enabled: true,
    api_url: 'https://api.openai.com',
    description: 'GPT models',
    logo: '/images/openai.png',
    models_count: 2
  },
  {
    id: 'google',
    name: 'Google',
    enabled: true,
    api_url: 'https://generativelanguage.googleapis.com',
    description: 'Gemini models',
    logo: '/images/google.png',
    models_count: 1
  },
  {
    id: 'groq',
    name: 'Groq',
    enabled: true,
    api_url: 'https://api.groq.com',
    description: 'Fast inference',
    logo: '/images/groq.png',
    models_count: 1
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    enabled: true,
    api_url: 'https://api.deepseek.com',
    description: 'Coding models',
    logo: '/images/deepseek.png',
    models_count: 1
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    enabled: true,
    api_url: 'https://api.perplexity.ai',
    description: 'Online models',
    logo: '/images/perplexity.png',
    models_count: 1
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json({
      code: 200,
      data: PLATFORMS,
      success: true
    });

  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      code: 500,
      error: 'Failed to fetch platforms',
      details: error.message
    });
  }
}