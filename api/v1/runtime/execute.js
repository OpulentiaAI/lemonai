import { VercelRequest, VercelResponse } from '@vercel/node';
import { Sandbox } from '@e2b/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// E2B templates for different environments
const E2B_TEMPLATES = {
  python: process.env.E2B_TEMPLATE_PYTHON || 'python',
  nodejs: process.env.E2B_TEMPLATE_NODEJS || 'nodejs',
  general: process.env.E2B_TEMPLATE_GENERAL || 'base'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
    template: E2B_TEMPLATES.general,
    timeoutMs: 60000, // 60 second timeout
  });

  try {
    const { code, language, sessionId, files = [] } = req.body;

    // Upload any files to the sandbox
    for (const file of files) {
      await sandbox.filesystem.write(file.path, file.content);
    }

    let result;
    let output = '';
    let error = '';

    switch (language) {
      case 'python':
        // Execute Python code
        const pyResult = await sandbox.process.start({
          cmd: 'python',
          args: ['-c', code],
          onStdout: (data) => { output += data; },
          onStderr: (data) => { error += data; }
        });
        await pyResult.wait();
        result = { output, error, exitCode: pyResult.exitCode };
        break;

      case 'javascript':
      case 'typescript':
        // Execute JavaScript/TypeScript
        const jsResult = await sandbox.process.start({
          cmd: 'node',
          args: ['-e', code],
          onStdout: (data) => { output += data; },
          onStderr: (data) => { error += data; }
        });
        await jsResult.wait();
        result = { output, error, exitCode: jsResult.exitCode };
        break;

      case 'bash':
      case 'shell':
        // Execute shell commands
        const shellResult = await sandbox.process.start({
          cmd: 'bash',
          args: ['-c', code],
          onStdout: (data) => { output += data; },
          onStderr: (data) => { error += data; }
        });
        await shellResult.wait();
        result = { output, error, exitCode: shellResult.exitCode };
        break;

      default:
        // Try to execute as shell command
        const defaultResult = await sandbox.process.start({
          cmd: 'bash',
          args: ['-c', code],
          onStdout: (data) => { output += data; },
          onStderr: (data) => { error += data; }
        });
        await defaultResult.wait();
        result = { output, error, exitCode: defaultResult.exitCode };
    }

    // Save execution result to database
    if (sessionId) {
      await supabase.from('executions').insert({
        session_id: sessionId,
        code,
        language,
        output: result.output,
        error: result.error,
        exit_code: result.exitCode,
        created_at: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      result: {
        output: result.output,
        error: result.error,
        exitCode: result.exitCode
      }
    });

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      error: 'Failed to execute code',
      details: error.message
    });
  } finally {
    // Always close the sandbox
    await sandbox.close();
  }
}