import { type TfsSourceId } from './config.js';
import type { UserCredentials } from './authTypes.js';
export interface TfsProject {
    id: string;
    name: string;
    description: string;
    state: string;
    url: string;
    source: TfsSourceId;
    sourceLabel: string;
}
/**
 * Verifies credential candidates against TFS and returns the first that works.
 */
export declare function verifyCredentials(candidates: UserCredentials[]): Promise<UserCredentials>;
/**
 * Fetches all projects from a single TFS collection using the caller's credentials.
 */
export declare function fetchProjectsFromSource(sourceId: TfsSourceId, credentials: UserCredentials): Promise<TfsProject[]>;
/**
 * Fetches and merges projects from all configured TFS sources for one user.
 */
export declare function fetchAllProjects(credentials: UserCredentials): Promise<{
    projects: TfsProject[];
    errors: Array<{
        source: TfsSourceId;
        message: string;
    }>;
}>;
