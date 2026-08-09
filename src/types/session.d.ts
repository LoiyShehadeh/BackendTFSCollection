import 'express-session';
import type { UserCredentials } from './authTypes.js';

declare module 'express-session' {
  interface SessionData {
    user?: UserCredentials;
  }
}
