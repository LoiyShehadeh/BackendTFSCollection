import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
let db = null;
/**
 * Returns the shared SQLite database instance, initializing schema on first use.
 */
export function getDb() {
    if (db) {
        return db;
    }
    const dir = path.dirname(config.databasePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(config.databasePath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    return db;
}
/**
 * Creates tables for sub-projects and database connections if they do not exist.
 */
function initSchema(database) {
    database.exec(`
    CREATE TABLE IF NOT EXISTS sub_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tfs_source TEXT NOT NULL,
      tfs_project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sub_projects_tfs
      ON sub_projects (tfs_source, tfs_project_id);

    CREATE TABLE IF NOT EXISTS db_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub_project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      server TEXT NOT NULL,
      database_name TEXT NOT NULL,
      username TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT 'sqlserver',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sub_project_id) REFERENCES sub_projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_db_connections_sub_project
      ON db_connections (sub_project_id);
  `);
}
