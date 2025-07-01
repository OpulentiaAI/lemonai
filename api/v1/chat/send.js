import { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize cloud services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cloud LLM providers
const providers = {
  openai: () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  anthropic: () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  google: () => new GoogleGenerativeAI(process.env.GOOGLE_API_KEY),
  groq: () => new Groq({ apiKey: process.env.GROQ_API_KEY }),
  deepseek: () => new OpenAI({ 
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1'
  }),
  perplexity: () => new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
  })
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId, provider = 'anthropic', model = process.env.DEFAULT_MODEL } = req.body;

    // Save message to Supabase
    const { data: messageData, error: msgError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        content: message,
        role: 'user',
        created_at: new Date().toISOString()
      })
      .single();

    if (msgError) throw msgError;

    // Get conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Call appropriate LLM provider
    let response;
    switch (provider) {
      case 'openai':
        const openai = providers.openai();
        const completion = await openai.chat.completions.create({
          model: model || 'gpt-4-turbo-preview',
          messages: history.map(msg => ({
            role: msg.role,
            content: msg.content
          })).concat([{ role: 'user', content: message }]),
          stream: false
        });
        response = completion.choices[0].message.content;
        break;

      case 'anthropic':
        const anthropic = providers.anthropic();
        const claudeResponse = await anthropic.messages.create({
          model: model || process.env.DEFAULT_MODEL || 'claude-opus-4-20250514',
          max_tokens: 4096,
          messages: history.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })).concat([{ role: 'user', content: message }])
        });
        response = claudeResponse.content[0].text;
        break;

      case 'google':
        const genAI = await providers.google();
        const googleModel = genAI.getGenerativeModel({ model: model || 'gemini-pro' });
        const result = await googleModel.generateContent(message);
        response = result.response.text();
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Save assistant response
    const { data: assistantMsg } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        content: response,
        role: 'assistant',
        created_at: new Date().toISOString()
      })
      .single();

    res.status(200).json({
      success: true,
      message: response,
      messageId: assistantMsg.id
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
}