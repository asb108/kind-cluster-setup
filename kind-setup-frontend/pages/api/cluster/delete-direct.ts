import { type NextApiRequest, type NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Direct cluster deletion API endpoint
 * This endpoint executes the 'kind delete cluster' command directly
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
    // Get cluster name from request body
    const { cluster_name } = req.body;

    if (!cluster_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing cluster_name in request body',
      });
    }

    console.log(
      `Executing direct kind delete cluster command for: ${cluster_name}`
    );

    // Execute the kind delete cluster command
    const { stdout, stderr } = await execPromise(
      `kind delete cluster --name ${cluster_name}`
    );

    // Check if there was an error
    if (stderr && !stderr.includes('Deleted cluster')) {
      console.error(`Error deleting cluster: ${stderr}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete cluster',
        error: stderr,
      });
    }

    console.log(`Successfully deleted cluster ${cluster_name}`);
    console.log(`Command output: ${stdout}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Cluster ${cluster_name} deleted successfully`,
      cluster_name: cluster_name,
      details: { stdout, stderr },
    });
  } catch (error) {
    console.error('Error in delete-direct API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
