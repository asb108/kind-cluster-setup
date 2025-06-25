import { type NextApiRequest, type NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Subprocess execution API endpoint
 * This endpoint executes arbitrary commands with proper validation
 *
 * SECURITY NOTE: This endpoint should be properly secured in production
 * as it allows command execution. In a real-world scenario, you would:
 * 1. Add authentication
 * 2. Restrict allowed commands to a whitelist
 * 3. Sanitize all inputs
 * 4. Add rate limiting
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
    });
  }

  try {
    // Get command and args from request body
    const { command, args = [] } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'Missing command in request body',
      });
    }

    // SECURITY: Whitelist allowed commands
    const allowedCommands = ['kind', 'kubectl', 'docker'];
    if (!allowedCommands.includes(command)) {
      return res.status(403).json({
        success: false,
        message: `Command not allowed. Allowed commands: ${allowedCommands.join(', ')}`,
      });
    }

    // SECURITY: Validate args to prevent command injection
    if (!Array.isArray(args)) {
      return res.status(400).json({
        success: false,
        message: 'Args must be an array',
      });
    }

    // SECURITY: Sanitize args
    const sanitizedArgs = args.map(arg => {
      if (typeof arg !== 'string') {
        return String(arg);
      }
      // Basic sanitization - remove shell special characters
      return arg.replace(/[;&|`$(){}[\]\\]/g, '');
    });

    // Build the command string
    const commandString = `${command} ${sanitizedArgs.join(' ')}`;
    console.log(`Executing command: ${commandString}`);

    // Execute the command
    const { stdout, stderr } = await execPromise(commandString);

    // Return the result
    return res.status(200).json({
      success: true,
      command: commandString,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('Error in subprocess execute API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
