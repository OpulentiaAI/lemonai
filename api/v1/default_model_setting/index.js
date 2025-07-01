import { VercelRequest, VercelResponse } from '@vercel/node';

// Default model settings
const DEFAULT_SETTINGS = {
  assistant: {
    model_id: 'claude-opus-4-20250514',
    model_name: 'Claude Opus 4',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  },
  'topic-naming': {
    model_id: 'claude-3-5-sonnet-20241022',
    model_name: 'Claude 3.5 Sonnet',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  },
  'task-planning': {
    model_id: 'claude-opus-4-20250514',
    model_name: 'Claude Opus 4',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      res.status(200).json({
        code: 200,
        data: DEFAULT_SETTINGS,
        success: true
      });
    } catch (error) {
      res.status(500).json({
        code: 500,
        error: 'Failed to fetch default model settings',
        details: error.message
      });
    }
  } else if (req.method === 'PUT') {
    try {
      // In a real app, you'd save this to a database
      // For now, just return success
      const updatedSettings = req.body;
      
      res.status(200).json({
        code: 200,
        data: updatedSettings,
        message: 'Default model settings updated',
        success: true
      });
    } catch (error) {
      res.status(500).json({
        code: 500,
        error: 'Failed to update default model settings',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}