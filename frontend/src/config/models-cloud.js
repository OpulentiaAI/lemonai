// Cloud model configuration for Vercel deployment
export const CLOUD_MODELS = [
  {
    id: 1001,
    model_id: 'claude-opus-4-20250514',
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
    id: 1002,
    model_id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    platform: 'Anthropic',
    platform_id: 'anthropic',
    enabled: true,
    max_tokens: 4096,
    description: 'Fast and capable',
    logo: '/images/anthropic.png'
  },
  {
    id: 1003,
    model_id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    platform: 'OpenAI',
    platform_id: 'openai',
    enabled: true,
    max_tokens: 4096,
    description: 'Latest GPT-4 with 128k context',
    logo: '/images/openai.png'
  },
  {
    id: 1004,
    model_id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    platform: 'OpenAI',
    platform_id: 'openai',
    enabled: true,
    max_tokens: 4096,
    description: 'Fast and cost-effective',
    logo: '/images/openai.png'
  },
  {
    id: 1005,
    model_id: 'gemini-pro',
    name: 'Gemini Pro',
    platform: 'Google',
    platform_id: 'google',
    enabled: true,
    max_tokens: 4096,
    description: 'Google\'s advanced model',
    logo: '/images/google.png'
  },
  {
    id: 1006,
    model_id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    platform: 'Groq',
    platform_id: 'groq',
    enabled: true,
    max_tokens: 32768,
    description: 'Fast inference with Groq',
    logo: '/images/groq.png'
  },
  {
    id: 1007,
    model_id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    platform: 'DeepSeek',
    platform_id: 'deepseek',
    enabled: true,
    max_tokens: 4096,
    description: 'Specialized for coding',
    logo: '/images/deepseek.png'
  },
  {
    id: 1008,
    model_id: 'pplx-70b-online',
    name: 'Perplexity 70B Online',
    platform: 'Perplexity',
    platform_id: 'perplexity',
    enabled: true,
    max_tokens: 4096,
    description: 'With real-time web access',
    logo: '/images/perplexity.png'
  }
];

export const CLOUD_PLATFORMS = [
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

export const DEFAULT_MODEL_SETTINGS = {
  assistant: {
    model_id: 1001,
    model_name: 'Claude Opus 4',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  },
  'topic-naming': {
    model_id: 1002,
    model_name: 'Claude 3.5 Sonnet',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  },
  'task-planning': {
    model_id: 1001,
    model_name: 'Claude Opus 4',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  }
};