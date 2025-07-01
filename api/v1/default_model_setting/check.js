import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return the expected format for model check
    res.status(200).json({
      code: 200,
      data: {
        has_default_platform: true,
        has_enabled_platform: true,
        has_search_setting: true
      },
      success: true
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      error: 'Failed to check model configuration',
      details: error.message
    });
  }
}