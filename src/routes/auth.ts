import { Router, type Request, type Response } from 'express';
import { buildCredentialCandidates } from '../authTypes.js';
import { config } from '../config.js';
import { verifyCredentials } from '../tfsClient.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

/**
 * POST /api/auth/login
 * Validates Windows credentials against TFS and stores them in the session.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const username = String(req.body?.username ?? '');
    const password = String(req.body?.password ?? '');
    const candidates = buildCredentialCandidates(
      username,
      password,
      config.tfs.defaultDomain
    );

    const credentials = await verifyCredentials(candidates);
    req.session.user = credentials;

    res.json({
      displayName: credentials.displayName,
      username: credentials.username,
      domain: credentials.domain,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

/**
 * POST /api/auth/logout
 * Clears the current session.
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to log out' });
      return;
    }
    res.clearCookie('tfs.portal.sid');
    res.json({ ok: true });
  });
});

/**
 * GET /api/auth/me
 * Returns the logged-in user display info (no password).
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.session.user!;
  res.json({
    displayName: user.displayName,
    username: user.username,
    domain: user.domain,
  });
});

export default router;
