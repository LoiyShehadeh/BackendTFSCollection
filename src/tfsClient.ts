import httpntlm from 'httpntlm';
import { config, type TfsSourceId } from './config.js';
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

interface TfsApiProject {
  id: string;
  name: string;
  description?: string;
  state?: string;
  url?: string;
}

interface TfsProjectsResponse {
  value?: TfsApiProject[];
  count?: number;
}

/**
 * Builds a Basic Authorization header for the given user credentials.
 */
function getBasicAuthHeader(credentials: UserCredentials): string {
  const user =
    credentials.domain && !credentials.username.includes('\\')
      ? `${credentials.domain}\\${credentials.username}`
      : credentials.username;
  return `Basic ${Buffer.from(`${user}:${credentials.password}`).toString('base64')}`;
}

/**
 * Performs an NTLM-authenticated GET against on-prem TFS/IIS.
 */
function ntlmGet(
  url: string,
  credentials: UserCredentials
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    httpntlm.get(
      {
        url,
        username: credentials.username,
        password: credentials.password,
        domain: credentials.domain,
        workstation: '',
        headers: {
          Accept: 'application/json',
        },
      },
      (err: Error | null, response: { statusCode?: number; body?: string }) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          statusCode: response.statusCode ?? 0,
          body: typeof response.body === 'string' ? response.body : String(response.body ?? ''),
        });
      }
    );
  });
}

/**
 * Performs a Basic-auth GET against TFS.
 */
async function basicGet(
  url: string,
  credentials: UserCredentials
): Promise<{ statusCode: number; body: string }> {
  const response = await fetch(url, {
    headers: {
      Authorization: getBasicAuthHeader(credentials),
      Accept: 'application/json',
    },
  });
  const body = await response.text();
  return { statusCode: response.status, body };
}

/**
 * Builds a TFS projects REST URL with properly encoded query params.
 * Important: `$top` must be encoded (`%24top`); a raw `$` often yields IIS/TFS 404 Page not found.
 */
function buildProjectsUrl(baseUrl: string, apiVersion: string, top?: number): string {
  const base = baseUrl.replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('api-version', apiVersion);
  if (typeof top === 'number') {
    params.set('$top', String(top));
  }
  return `${base}/_apis/projects?${params.toString()}`;
}

/**
 * API versions to try per source (older on-prem TFS may reject 4.1).
 */
function apiVersionsForSource(sourceId: TfsSourceId): string[] {
  if (sourceId === 'tfs2017') {
    return ['3.2', '2.0', '4.1', '1.0'];
  }
  return ['4.1', '3.2', '2.0'];
}

/**
 * GET helper that uses the configured TFS auth mode with the caller's credentials.
 */
async function tfsGet(
  url: string,
  credentials: UserCredentials
): Promise<{ statusCode: number; body: string }> {
  return config.tfs.authMode === 'basic'
    ? basicGet(url, credentials)
    : ntlmGet(url, credentials);
}

/**
 * Loads projects JSON, trying compatible API versions until one succeeds.
 */
async function fetchProjectsPayload(
  sourceId: TfsSourceId,
  credentials: UserCredentials,
  top?: number
): Promise<{ statusCode: number; body: string; url: string }> {
  const source = config.tfs.sources[sourceId];
  const versions = apiVersionsForSource(sourceId);
  let last = { statusCode: 0, body: '', url: '' };

  for (const apiVersion of versions) {
    const url = buildProjectsUrl(source.baseUrl, apiVersion, top);
    const result = await tfsGet(url, credentials);
    last = { ...result, url };
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return last;
    }
    // Only fall through on version/path style failures
    if (![400, 404].includes(result.statusCode)) {
      return last;
    }
  }

  return last;
}

/**
 * Shortens TFS HTML error bodies for UI display.
 */
function summarizeTfsErrorBody(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (!text) {
    return 'no response body';
  }
  if (/page not found/i.test(text)) {
    return 'Page not found (check collection URL / API path)';
  }
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

/**
 * Verifies credential candidates against TFS and returns the first that works.
 */
export async function verifyCredentials(
  candidates: UserCredentials[]
): Promise<UserCredentials> {
  if (!candidates.length) {
    throw new Error('Username and password are required');
  }

  const sourceIds = Object.keys(config.tfs.sources) as TfsSourceId[];
  const errors: string[] = [];

  for (const credentials of candidates) {
    for (const sourceId of sourceIds) {
      const source = config.tfs.sources[sourceId];
      try {
        const result = await fetchProjectsPayload(sourceId, credentials, 1);
        if (result.statusCode >= 200 && result.statusCode < 300) {
          return credentials;
        }
        errors.push(
          `${credentials.displayName} @ ${source.label}: HTTP ${result.statusCode}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${credentials.displayName} @ ${source.label}: ${message}`);
      }
    }
  }

  throw new Error(
    `Login failed against TFS. Prefer DOMAIN\\username (e.g. REALSOFT-ME\\loiy.shehadeh). Details: ${errors
      .slice(0, 6)
      .join('; ')}`
  );
}

/**
 * Fetches all projects from a single TFS collection using the caller's credentials.
 */
export async function fetchProjectsFromSource(
  sourceId: TfsSourceId,
  credentials: UserCredentials
): Promise<TfsProject[]> {
  const source = config.tfs.sources[sourceId];
  const result = await fetchProjectsPayload(sourceId, credentials, 1000);

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(
      `Failed to load projects from ${source.label} (${result.statusCode}): ${summarizeTfsErrorBody(result.body)} [${result.url}]`
    );
  }

  const data = JSON.parse(result.body) as TfsProjectsResponse;
  const projects = data.value ?? [];

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    state: project.state ?? '',
    url: project.url ?? '',
    source: sourceId,
    sourceLabel: source.label,
  }));
}

/**
 * Fetches and merges projects from all configured TFS sources for one user.
 */
export async function fetchAllProjects(credentials: UserCredentials): Promise<{
  projects: TfsProject[];
  errors: Array<{ source: TfsSourceId; message: string }>;
}> {
  const sourceIds = Object.keys(config.tfs.sources) as TfsSourceId[];
  const results = await Promise.allSettled(
    sourceIds.map((id) => fetchProjectsFromSource(id, credentials))
  );

  const projects: TfsProject[] = [];
  const errors: Array<{ source: TfsSourceId; message: string }> = [];

  results.forEach((result, index) => {
    const sourceId = sourceIds[index];
    if (result.status === 'fulfilled') {
      projects.push(...result.value);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ source: sourceId, message });
    }
  });

  projects.sort((a, b) => a.name.localeCompare(b.name));
  return { projects, errors };
}
