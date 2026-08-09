import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { config } from './config.js';
import { getDb } from './db.js';
import authRoutes from './routes/auth.js';
import tfsRoutes from './routes/tfs.js';
import crudRoutes from './routes/crud.js';
import { requireAuth } from './middleware/requireAuth.js';

const app = express();

/**
 * Allows configured CORS origin plus any localhost / 127.0.0.1 port (Angular may pick a free port).
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (origin === config.corsOrigin) {
    return true;
  }
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    name: 'tfs.portal.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

// Ensure DB is ready at startup
getDb();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tfs', tfsRoutes);
app.use('/api', requireAuth, crudRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

const server = app.listen(config.port, () => {
  console.log(`TFS Projects Portal API listening on http://localhost:${config.port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other process or change PORT in .env.`);
  } else {
    console.error('Server failed to start:', err);
  }
  process.exit(1);
});
