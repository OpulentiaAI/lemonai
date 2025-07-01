import { VercelRequest, VercelResponse } from '@vercel/node';

// Define available models with cloud services
const AVAILABLE_MODELS = [
  {
    id: 1001,
    model_id: 'claude-opus-4-20250514',
    model_name: 'Claude Opus 4',
    platform_name: 'Anthropic',
    platform_id: 'anthropic',
    enabled: true,
    is_default: true,
    max_tokens: 4096,
    description: 'Most capable Claude model',
    logo_url: null
  },
  {
    id: 1002,
    model_id: 'claude-3-5-sonnet-20241022',
    model_name: 'Claude 3.5 Sonnet',
    platform_name: 'Anthropic',
    platform_id: 'anthropic',
    enabled: true,
    max_tokens: 4096,
    description: 'Fast and capable',
    logo_url: null
  },
  {
    id: 1003,
    model_id: 'gpt-4-turbo-preview',
    model_name: 'GPT-4 Turbo',
    platform_name: 'OpenAI',
    platform_id: 'openai',
    enabled: true,
    max_tokens: 4096,
    description: 'Latest GPT-4 with 128k context',
    logo_url: null
  },
  {
    id: 1004,
    model_id: 'gpt-3.5-turbo',
    model_name: 'GPT-3.5 Turbo',
    platform_name: 'OpenAI',
    platform_id: 'openai',
    enabled: true,
    max_tokens: 4096,
    description: 'Fast and cost-effective',
    logo_url: null
  },
  {
    id: 1005,
    model_id: 'gemini-pro',
    model_name: 'Gemini Pro',
    platform_name: 'Google',
    platform_id: 'google',
    enabled: true,
    max_tokens: 4096,
    description: 'Google\'s advanced model',
    logo_url: null
  },
  {
    id: 1006,
    model_id: 'mixtral-8x7b-32768',
    model_name: 'Mixtral 8x7B',
    platform_name: 'Groq',
    platform_id: 'groq',
    enabled: true,
    max_tokens: 32768,
    description: 'Fast inference with Groq',
    logo_url: null
  },
  {
    id: 1007,
    model_id: 'deepseek-coder',
    model_name: 'DeepSeek Coder',
    platform_name: 'DeepSeek',
    platform_id: 'deepseek',
    enabled: true,
    max_tokens: 4096,
    description: 'Specialized for coding',
    logo_url: null
  },
  {
    id: 1008,
    model_id: 'pplx-70b-online',
    model_name: 'Perplexity 70B Online',
    platform_name: 'Perplexity',
    platform_id: 'perplexity',
    enabled: true,
    max_tokens: 4096,
    description: 'With real-time web access',
    logo_url: null
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return enabled models grouped by platform
    const modelsByPlatform = AVAILABLE_MODELS.reduce((acc, model) => {
      if (!acc[model.platform_name]) {
        acc[model.platform_name] = [];
      }
      acc[model.platform_name].push(model);
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