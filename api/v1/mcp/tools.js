import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Cloud-hosted MCP servers configuration
const MCP_SERVERS = {
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp/workspace']
  },
  github: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
  },
  gitlab: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gitlab'],
    env: { GITLAB_TOKEN: process.env.GITLAB_TOKEN }
  },
  postgres: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL]
  },
  puppeteer: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer']
  }
};

// Cache for MCP clients
const clientCache = new Map();

async function getMCPClient(serverName) {
  if (clientCache.has(serverName)) {
    return clientCache.get(serverName);
  }

  const serverConfig = MCP_SERVERS[serverName];
  if (!serverConfig) {
    throw new Error(`Unknown MCP server: ${serverName}`);
  }

  const transport = new StdioClientTransport({
    command: serverConfig.command,
    args: serverConfig.args,
    env: { ...process.env, ...serverConfig.env }
  });

  const client = new Client({
    name: `vercel-${serverName}`,
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  clientCache.set(serverName, client);

  return client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // List available tools from all MCP servers
    try {
      const tools = [];
      
      for (const serverName of Object.keys(MCP_SERVERS)) {
        try {
          const client = await getMCPClient(serverName);
          const serverTools = await client.listTools();
          
          tools.push(...serverTools.tools.map(tool => ({
            ...tool,
            server: serverName
          })));
        } catch (error) {
          console.error(`Failed to get tools from ${serverName}:`, error);
        }
      }

      res.status(200).json({ tools });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list tools', details: error.message });
    }
  } else if (req.method === 'POST') {
    // Execute a tool
    try {
      const { server, tool, arguments: args, sessionId } = req.body;

      const client = await getMCPClient(server);
      const result = await client.callTool({
        name: tool,
        arguments: args
      });

      // Log tool usage
      if (sessionId) {
        await supabase.from('tool_usage').insert({
          session_id: sessionId,
          server,
          tool,
          arguments: args,
          result: result.content,
          created_at: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        result: result.content
      });
    } catch (error) {
      console.error('Tool execution error:', error);
      res.status(500).json({
        error: 'Failed to execute tool',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}