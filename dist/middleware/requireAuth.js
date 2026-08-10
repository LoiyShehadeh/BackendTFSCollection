/**
 * Requires an authenticated session; responds 401 when missing.
 */
export function requireAuth(req, res, next) {
    if (!req.session.user) {
        res.status(401).json({ error: 'Login required' });
        return;
    }
    req.user = req.session.user;
    next();
}
