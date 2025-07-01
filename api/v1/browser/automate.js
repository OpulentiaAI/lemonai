import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Browserbase configuration
const BROWSERBASE_API_URL = 'https://www.browserbase.com/v1';

async function createBrowserSession() {
  const response = await fetch(`${BROWSERBASE_API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'X-BB-API-Key': process.env.BROWSERBASE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: {
        viewport: { width: 1920, height: 1080 }
      }
    })
  });
  return response.json();
}

async function executeBrowserAction(sessionId, action) {
  const response = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}/actions`, {
    method: 'POST',
    headers: {
      'X-BB-API-Key': process.env.BROWSERBASE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(action)
  });
  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browserSession;
  
  try {
    const { action, url, selector, text, screenshot, sessionId } = req.body;

    // Create or reuse browser session
    if (!req.body.browserSessionId) {
      browserSession = await createBrowserSession();
    } else {
      browserSession = { id: req.body.browserSessionId };
    }

    let result;

    switch (action) {
      case 'navigate':
        result = await executeBrowserAction(browserSession.id, {
          type: 'navigate',
          url
        });
        break;

      case 'click':
        result = await executeBrowserAction(browserSession.id, {
          type: 'click',
          selector
        });
        break;

      case 'type':
        result = await executeBrowserAction(browserSession.id, {
          type: 'type',
          selector,
          text
        });
        break;

      case 'screenshot':
        result = await executeBrowserAction(browserSession.id, {
          type: 'screenshot',
          fullPage: screenshot?.fullPage || false
        });
        break;

      case 'extract':
        result = await executeBrowserAction(browserSession.id, {
          type: 'evaluate',
          script: `
            const elements = document.querySelectorAll('${selector}');
            return Array.from(elements).map(el => ({
              text: el.textContent,
              href: el.href || null,
              src: el.src || null
            }));
          `
        });
        break;

      case 'scrape':
        // Use Scrapybara for advanced scraping
        const scrapyResponse = await fetch('https://api.scrapybara.com/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SCRAPYBARA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            wait_for: selector,
            extract_rules: req.body.extractRules
          })
        });
        result = await scrapyResponse.json();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log action to database
    if (sessionId) {
      await supabase.from('browser_actions').insert({
        session_id: sessionId,
        action,
        parameters: { url, selector, text },
        result,
        browser_session_id: browserSession.id,
        created_at: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      browserSessionId: browserSession.id,
      result
    });

  } catch (error) {
    console.error('Browser automation error:', error);
    res.status(500).json({
      error: 'Failed to execute browser action',
      details: error.message
    });
  }
}