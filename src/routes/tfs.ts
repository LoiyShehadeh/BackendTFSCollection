import { Router, type Request, type Response } from 'express';
import { fetchAllProjects } from '../tfsClient.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

/**
 * GET /api/tfs/projects
 * Returns merged projects from both TFS collections for the logged-in user.
 */
router.get('/projects', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const result = await fetchAllProjects(user);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load TFS projects';
    res.status(500).json({ error: message });
  }
});

export default router;
