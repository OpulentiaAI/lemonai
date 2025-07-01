import { VercelRequest, VercelResponse } from '@vercel/node';

// Default model settings - return as array to match expected format
const DEFAULT_SETTINGS = [
  {
    setting_type: 'assistant',
    model_id: 1001,
    model_name: 'Claude Opus 4',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  },
  {
    setting_type: 'topic-naming',
    model_id: 1002,
    model_name: 'Claude 3.5 Sonnet',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  },
  {
    setting_type: 'task-planning',
    model_id: 1001,
    model_name: 'Claude Opus 4',
    platform: 'Anthropic',
    platform_id: 'anthropic'
  }
];

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