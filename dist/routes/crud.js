import { Router } from 'express';
import { getDb } from '../db.js';
import { config } from '../config.js';
const router = Router();
/**
 * Maps a sub-project DB row to an API-friendly object.
 */
function mapSubProject(row) {
    return {
        id: row.id,
        tfsSource: row.tfs_source,
        tfsProjectId: row.tfs_project_id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/**
 * Maps a DB connection row to an API-friendly object.
 */
function mapConnection(row) {
    return {
        id: row.id,
        subProjectId: row.sub_project_id,
        name: row.name,
        server: row.server,
        databaseName: row.database_name,
        username: row.username,
        password: row.password,
        provider: row.provider,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/**
 * Normalizes an Express route param to a single string.
 */
function paramValue(value) {
    if (Array.isArray(value)) {
        return value[0] ?? '';
    }
    return value ?? '';
}
/**
 * Validates that the source path param is a known TFS source id.
 */
function isValidSource(source) {
    return Object.prototype.hasOwnProperty.call(config.tfs.sources, source);
}
/**
 * GET /api/projects/:source/:projectId/subprojects
 * Lists sub-projects for a TFS project.
 */
router.get('/projects/:source/:projectId/subprojects', (req, res) => {
    const source = paramValue(req.params.source);
    const projectId = paramValue(req.params.projectId);
    if (!isValidSource(source)) {
        res.status(400).json({ error: `Unknown TFS source: ${source}` });
        return;
    }
    const rows = getDb()
        .prepare(`SELECT * FROM sub_projects
       WHERE tfs_source = ? AND tfs_project_id = ?
       ORDER BY name COLLATE NOCASE`)
        .all(source, projectId);
    res.json(rows.map(mapSubProject));
});
/**
 * POST /api/projects/:source/:projectId/subprojects
 * Creates a sub-project under a TFS project.
 */
router.post('/projects/:source/:projectId/subprojects', (req, res) => {
    const source = paramValue(req.params.source);
    const projectId = paramValue(req.params.projectId);
    if (!isValidSource(source)) {
        res.status(400).json({ error: `Unknown TFS source: ${source}` });
        return;
    }
    const name = String(req.body?.name ?? '').trim();
    const description = String(req.body?.description ?? '').trim();
    if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const result = getDb()
        .prepare(`INSERT INTO sub_projects (tfs_source, tfs_project_id, name, description)
       VALUES (?, ?, ?, ?)`)
        .run(source, projectId, name, description);
    const row = getDb()
        .prepare('SELECT * FROM sub_projects WHERE id = ?')
        .get(result.lastInsertRowid);
    res.status(201).json(mapSubProject(row));
});
/**
 * PUT /api/subprojects/:id
 * Updates a sub-project name/description.
 */
router.put('/subprojects/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid sub-project id' });
        return;
    }
    const existing = getDb()
        .prepare('SELECT * FROM sub_projects WHERE id = ?')
        .get(id);
    if (!existing) {
        res.status(404).json({ error: 'Sub-project not found' });
        return;
    }
    const name = String(req.body?.name ?? existing.name).trim();
    const description = req.body?.description !== undefined
        ? String(req.body.description).trim()
        : existing.description;
    if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    getDb()
        .prepare(`UPDATE sub_projects
       SET name = ?, description = ?, updated_at = datetime('now')
       WHERE id = ?`)
        .run(name, description, id);
    const row = getDb()
        .prepare('SELECT * FROM sub_projects WHERE id = ?')
        .get(id);
    res.json(mapSubProject(row));
});
/**
 * DELETE /api/subprojects/:id
 * Deletes a sub-project and its connections (cascade).
 */
router.delete('/subprojects/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid sub-project id' });
        return;
    }
    const result = getDb().prepare('DELETE FROM sub_projects WHERE id = ?').run(id);
    if (result.changes === 0) {
        res.status(404).json({ error: 'Sub-project not found' });
        return;
    }
    res.status(204).send();
});
/**
 * GET /api/subprojects/:id/connections
 * Lists database connections for a sub-project.
 */
router.get('/subprojects/:id/connections', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid sub-project id' });
        return;
    }
    const subProject = getDb()
        .prepare('SELECT id FROM sub_projects WHERE id = ?')
        .get(id);
    if (!subProject) {
        res.status(404).json({ error: 'Sub-project not found' });
        return;
    }
    const rows = getDb()
        .prepare(`SELECT * FROM db_connections
       WHERE sub_project_id = ?
       ORDER BY name COLLATE NOCASE`)
        .all(id);
    res.json(rows.map(mapConnection));
});
/**
 * POST /api/subprojects/:id/connections
 * Creates a database connection under a sub-project.
 */
router.post('/subprojects/:id/connections', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid sub-project id' });
        return;
    }
    const subProject = getDb()
        .prepare('SELECT id FROM sub_projects WHERE id = ?')
        .get(id);
    if (!subProject) {
        res.status(404).json({ error: 'Sub-project not found' });
        return;
    }
    const name = String(req.body?.name ?? '').trim();
    const server = String(req.body?.server ?? '').trim();
    const databaseName = String(req.body?.databaseName ?? '').trim();
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const provider = String(req.body?.provider ?? 'sqlserver').trim() || 'sqlserver';
    if (!name || !server || !databaseName) {
        res.status(400).json({ error: 'name, server, and databaseName are required' });
        return;
    }
    const result = getDb()
        .prepare(`INSERT INTO db_connections
         (sub_project_id, name, server, database_name, username, password, provider)
       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(id, name, server, databaseName, username, password, provider);
    const row = getDb()
        .prepare('SELECT * FROM db_connections WHERE id = ?')
        .get(result.lastInsertRowid);
    res.status(201).json(mapConnection(row));
});
/**
 * PUT /api/connections/:id
 * Updates a database connection.
 */
router.put('/connections/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid connection id' });
        return;
    }
    const existing = getDb()
        .prepare('SELECT * FROM db_connections WHERE id = ?')
        .get(id);
    if (!existing) {
        res.status(404).json({ error: 'Connection not found' });
        return;
    }
    const name = String(req.body?.name ?? existing.name).trim();
    const server = String(req.body?.server ?? existing.server).trim();
    const databaseName = String(req.body?.databaseName ?? existing.database_name).trim();
    const username = req.body?.username !== undefined ? String(req.body.username).trim() : existing.username;
    const password = req.body?.password !== undefined ? String(req.body.password) : existing.password;
    const provider = req.body?.provider !== undefined
        ? String(req.body.provider).trim() || 'sqlserver'
        : existing.provider;
    if (!name || !server || !databaseName) {
        res.status(400).json({ error: 'name, server, and databaseName are required' });
        return;
    }
    getDb()
        .prepare(`UPDATE db_connections
       SET name = ?, server = ?, database_name = ?, username = ?, password = ?,
           provider = ?, updated_at = datetime('now')
       WHERE id = ?`)
        .run(name, server, databaseName, username, password, provider, id);
    const row = getDb()
        .prepare('SELECT * FROM db_connections WHERE id = ?')
        .get(id);
    res.json(mapConnection(row));
});
/**
 * DELETE /api/connections/:id
 * Deletes a database connection.
 */
router.delete('/connections/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid connection id' });
        return;
    }
    const result = getDb().prepare('DELETE FROM db_connections WHERE id = ?').run(id);
    if (result.changes === 0) {
        res.status(404).json({ error: 'Connection not found' });
        return;
    }
    res.status(204).send();
});
/**
 * POST /api/connections/:id/test
 * Stub endpoint for a future SQL Server connectivity check.
 */
router.post('/connections/:id/test', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid connection id' });
        return;
    }
    const existing = getDb()
        .prepare('SELECT id, name FROM db_connections WHERE id = ?')
        .get(id);
    if (!existing) {
        res.status(404).json({ error: 'Connection not found' });
        return;
    }
    res.json({
        ok: true,
        message: `Connection "${existing.name}" is stored. Live SQL Server testing is not enabled in v1.`,
    });
});
/**
 * GET /api/subprojects/:id
 * Returns a single sub-project (used by Angular detail page).
 */
router.get('/subprojects/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'Invalid sub-project id' });
        return;
    }
    const row = getDb()
        .prepare('SELECT * FROM sub_projects WHERE id = ?')
        .get(id);
    if (!row) {
        res.status(404).json({ error: 'Sub-project not found' });
        return;
    }
    res.json(mapSubProject(row));
});
export default router;
