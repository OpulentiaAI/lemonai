import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

// Request metrics store
const metricsStore = {
  totalRequests: 0,
  successfulRequests: 0,
  errorRequests: 0,
  averageResponseTime: 0,
  lastRequestTime: null
};

// Utility functions
function generateRequestId(): string {
  return randomUUID();
}

function getClientIp(req: VercelRequest): string {
  return req.headers['x-forwarded-for'] as string || 
         req.headers['x-real-ip'] as string || 
         req.connection?.remoteAddress || 
         'unknown';
}

function logStructured(level: string, message: string, context: any = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  console.log(JSON.stringify(logEntry));
}

function validateRequest(req: VercelRequest): { isValid: boolean; error?: string } {
  // Validate HTTP method
  if (req.method !== 'GET') {
    return { isValid: false, error: 'Only GET method is allowed' };
  }

  // Validate required headers for CORS
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-domain.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    return { isValid: false, error: 'Origin not allowed' };
  }

  return { isValid: true };
}

function checkRateLimit(clientIp: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientIp) || { requests: 0, windowStart: now };

  // Reset window if expired
  if (now - clientData.windowStart > RATE_LIMIT_WINDOW) {
    clientData.requests = 0;
    clientData.windowStart = now;
  }

  if (clientData.requests >= RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      resetTime: clientData.windowStart + RATE_LIMIT_WINDOW 
    };
  }

  clientData.requests++;
  rateLimitStore.set(clientIp, clientData);
  return { allowed: true };
}

function validateResponse(data: any): { isValid: boolean; error?: string } {
  if (!data) {
    return { isValid: false, error: 'Response data is null or undefined' };
  }

  if (!Array.isArray(data)) {
    return { isValid: false, error: 'Response data must be an array' };
  }

  // Validate each model object
  for (const model of data) {
    const requiredFields = ['id', 'model_id', 'model_name', 'platform_name', 'platform_id', 'enabled'];
    for (const field of requiredFields) {
      if (!(field in model)) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate data types
    if (typeof model.id !== 'number' || 
        typeof model.model_id !== 'string' ||
        typeof model.model_name !== 'string' ||
        typeof model.platform_name !== 'string' ||
        typeof model.platform_id !== 'string' ||
        typeof model.enabled !== 'boolean') {
      return { isValid: false, error: 'Invalid data types in model object' };
    }
  }

  return { isValid: true };
}

function setCorsHeaders(res: VercelResponse, origin?: string) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-domain.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

function setCacheHeaders(res: VercelResponse) {
  // Cache for 5 minutes in browser, 1 hour in CDN
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.setHeader('ETag', `"models-${Date.now()}"`)
  res.setHeader('Last-Modified', new Date().toUTCString());
}

function updateMetrics(startTime: number, success: boolean) {
  const responseTime = Date.now() - startTime;
  metricsStore.totalRequests++;
  metricsStore.lastRequestTime = new Date().toISOString();

  if (success) {
    metricsStore.successfulRequests++;
  } else {
    metricsStore.errorRequests++;
  }

  // Update average response time
  metricsStore.averageResponseTime = 
    (metricsStore.averageResponseTime * (metricsStore.totalRequests - 1) + responseTime) / 
    metricsStore.totalRequests;
}

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
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const origin = req.headers.origin as string;

  // Set request ID header for tracing
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  logStructured('info', 'Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    clientIp,
    userAgent,
    origin,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });

  try {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res, origin);
      res.status(200).end();
      updateMetrics(startTime, true);
      return;
    }

    // Validate request
    const requestValidation = validateRequest(req);
    if (!requestValidation.isValid) {
      logStructured('warn', 'Request validation failed', {
        requestId,
        clientIp,
        error: requestValidation.error,
        method: req.method,
        origin
      });

      setCorsHeaders(res, origin);
      res.status(400).json({
        code: 400,
        error: 'Bad Request',
        message: requestValidation.error,
        requestId,
        timestamp: new Date().toISOString()
      });
      updateMetrics(startTime, false);
      return;
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      logStructured('warn', 'Rate limit exceeded', {
        requestId,
        clientIp,
        resetTime: rateLimitCheck.resetTime
      });

      setCorsHeaders(res, origin);
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitCheck.resetTime! / 1000).toString());

      res.status(429).json({
        code: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000),
        requestId,
        timestamp: new Date().toISOString()
      });
      updateMetrics(startTime, false);
      return;
    }

    // Health check endpoint
    if (req.url?.includes('health')) {
      setCorsHeaders(res, origin);
      res.status(200).json({
        code: 200,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          ...metricsStore,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        requestId
      });
      updateMetrics(startTime, true);
      return;
    }

    // Validate response data before processing
    const responseValidation = validateResponse(AVAILABLE_MODELS);
    if (!responseValidation.isValid) {
      logStructured('error', 'Response validation failed', {
        requestId,
        error: responseValidation.error,
        dataLength: AVAILABLE_MODELS?.length || 0
      });

      setCorsHeaders(res, origin);
      res.status(500).json({
        code: 500,
        error: 'Internal Server Error',
        message: 'Data validation failed',
        requestId,
        timestamp: new Date().toISOString()
      });
      updateMetrics(startTime, false);
      return;
    }

    // Process and return enabled models grouped by platform
    const enabledModels = AVAILABLE_MODELS.filter(model => model.enabled);
    const modelsByPlatform = enabledModels.reduce((acc, model) => {
      if (!acc[model.platform_name]) {
        acc[model.platform_name] = [];
      }
      acc[model.platform_name].push(model);
      return acc;
    }, {} as Record<string, typeof AVAILABLE_MODELS>);

    // Set response headers
    setCorsHeaders(res, origin);
    setCacheHeaders(res);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Total-Models', enabledModels.length.toString());
    res.setHeader('X-Platform-Count', Object.keys(modelsByPlatform).length.toString());

    const responseData = {
      code: 200,
      data: enabledModels,
      grouped: modelsByPlatform,
      success: true,
      metadata: {
        totalModels: enabledModels.length,
        platformCount: Object.keys(modelsByPlatform).length,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    // Final response validation
    const finalValidation = validateResponse(responseData.data);
    if (!finalValidation.isValid) {
      throw new Error(`Final validation failed: ${finalValidation.error}`);
    }

    logStructured('info', 'Request completed successfully', {
      requestId,
      clientIp,
      responseTime: Date.now() - startTime,
      modelsReturned: enabledModels.length,
      platformsReturned: Object.keys(modelsByPlatform).length
    });

    res.status(200).json(responseData);
    updateMetrics(startTime, true);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logStructured('error', 'Request failed with error', {
      requestId,
      clientIp,
      error: errorMessage,
      stack: errorStack,
      responseTime: Date.now() - startTime,
      url: req.url,
      method: req.method
    });

    setCorsHeaders(res, origin);
    res.status(500).json({
      code: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch models',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      requestId,
      timestamp: new Date().toISOString()
    });
    updateMetrics(startTime, false);
  }
}
