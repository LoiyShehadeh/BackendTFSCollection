import Database from 'better-sqlite3';
/**
 * Returns the shared SQLite database instance, initializing schema on first use.
 */
export declare function getDb(): Database.Database;
