import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
dotenv.config();
/**
 * Application configuration loaded from environment variables.
 * TFS user credentials are per-login session — not taken from .env.
 */
export const config = {
    port: Number(process.env.PORT) || 3000,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    /** Extra allowed frontend origins (comma-separated), e.g. Netlify URLs. */
    corsOrigins: (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'portal.db'),
    sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    tfs: {
        /** Prefer ntlm for on-prem TFS/IIS Windows auth. */
        authMode: (process.env.TFS_AUTH_MODE || 'ntlm').toLowerCase(),
        /** NetBIOS domain used when login is email or bare username (e.g. REALSOFT-ME). */
        defaultDomain: (process.env.TFS_DEFAULT_DOMAIN || '').trim(),
        sources: {
            tfs2018: {
                id: 'tfs2018',
                label: 'TFS 2018',
                baseUrl: process.env.TFS_2018_URL || 'http://tfs2018:8080/tfs/Realsoft-Projects',
            },
            tfs2017: {
                id: 'tfs2017',
                label: 'TFS 2017',
                baseUrl: process.env.TFS_2017_URL || 'http://tfs2017srv:8080/tfs/DefaultCollection',
            },
        },
    },
};
