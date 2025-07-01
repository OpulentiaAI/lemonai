import { VercelRequest, VercelResponse } from '@vercel/node';

// Define available models with cloud services
const AVAILABLE_MODELS = [
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    platform: 'Anthropic',
    platform_id: 'anthropic',
    enabled: true,
    is_default: true,
    max_tokens: 4096,
    description: 'Most capable Claude model',
    logo: '/images/anthropic.png'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    platform: 'Anthropic',
    platform_id: 'anthropic',
    enabled: true,
    max_tokens: 4096,
    description: 'Fast and capable',
    logo: '/images/anthropic.png'
  },
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    platform: 'OpenAI',
    platform_id: 'openai',
    enabled: true,
    max_tokens: 4096,
    description: 'Latest GPT-4 with 128k context',
    logo: '/images/openai.png'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    platform: 'OpenAI',
    platform_id: 'openai',
    enabled: true,
    max_tokens: 4096,
    description: 'Fast and cost-effective',
    logo: '/images/openai.png'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    platform: 'Google',
    platform_id: 'google',
    enabled: true,
    max_tokens: 4096,
    description: 'Google\'s advanced model',
    logo: '/images/google.png'
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    platform: 'Groq',
    platform_id: 'groq',
    enabled: true,
    max_tokens: 32768,
    description: 'Fast inference with Groq',
    logo: '/images/groq.png'
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    platform: 'DeepSeek',
    platform_id: 'deepseek',
    enabled: true,
    max_tokens: 4096,
    description: 'Specialized for coding',
    logo: '/images/deepseek.png'
  },
  {
    id: 'pplx-70b-online',
    name: 'Perplexity 70B Online',
    platform: 'Perplexity',
    platform_id: 'perplexity',
    enabled: true,
    max_tokens: 4096,
    description: 'With real-time web access',
    logo: '/images/perplexity.png'
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return enabled models grouped by platform
    const modelsByPlatform = AVAILABLE_MODELS.reduce((acc, model) => {
      if (!acc[model.platform]) {
        acc[model.platform] = [];
      }
      acc[model.platform].push(model);
      return acc;
    }, {});

    res.status(200).json({
      code: 200,
      data: AVAILABLE_MODELS,
      grouped: modelsByPlatform,
      success: true
    });

  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      code: 500,
      error: 'Failed to fetch models',
      details: error.message
    });
  }
}