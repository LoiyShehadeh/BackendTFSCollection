import { Router } from 'express';
import { fetchAllProjects } from '../tfsClient.js';
import { requireAuth } from '../middleware/requireAuth.js';
const router = Router();
/**
 * GET /api/tfs/projects
 * Returns merged projects from both TFS collections for the logged-in user.
 */
router.get('/projects', requireAuth, async (req, res) => {
    try {
        const { user } = req;
        const result = await fetchAllProjects(user);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load TFS projects';
        res.status(500).json({ error: message });
    }
});
export default router;
