/**
 * Windows credentials for a logged-in portal user (stored in session).
 */
export interface UserCredentials {
  domain: string;
  username: string;
  password: string;
  /** Display name shown in the UI (DOMAIN\\user). */
  displayName: string;
}

/**
 * Builds a credentials object with a consistent display name.
 */
function makeCredentials(domain: string, username: string, password: string): UserCredentials {
  const displayName = domain ? `${domain}\\${username}` : username;
  return { domain, username, password, displayName };
}

/**
 * Deduplicates credential candidates by domain+username.
 */
function uniqueCredentials(items: UserCredentials[]): UserCredentials[] {
  const seen = new Set<string>();
  const result: UserCredentials[] = [];
  for (const item of items) {
    const key = `${item.domain.toLowerCase()}|${item.username.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * Builds NTLM credential candidates from a login username (DOMAIN\user, user, or email/UPN).
 * Email domains are often not the Windows NetBIOS domain, so we also try the default domain.
 */
export function buildCredentialCandidates(
  usernameInput: string,
  password: string,
  defaultDomain = ''
): UserCredentials[] {
  const raw = usernameInput.trim();
  if (!raw || !password) {
    throw new Error('Username and password are required');
  }

  const candidates: UserCredentials[] = [];
  const fallback = defaultDomain.trim();

  if (raw.includes('\\')) {
    const [domain, ...rest] = raw.split('\\');
    const username = rest.join('\\').trim();
    if (!username) {
      throw new Error('Username is required after DOMAIN\\');
    }
    candidates.push(makeCredentials(domain.trim(), username, password));
    return uniqueCredentials(candidates);
  }

  if (raw.includes('@')) {
    const [userPart, domainPart = ''] = raw.split('@');
    const username = userPart.trim();
    const upnDomain = domainPart.trim();
    const netbiosGuess = upnDomain.split('.')[0] || '';

    // Prefer corporate NetBIOS domain for on-prem TFS/NTLM
    if (fallback) {
      candidates.push(makeCredentials(fallback, username, password));
    }
    if (netbiosGuess) {
      candidates.push(makeCredentials(netbiosGuess, username, password));
    }
    if (upnDomain) {
      candidates.push(makeCredentials(upnDomain, username, password));
    }
    // Some IIS setups accept the full UPN in the username field
    candidates.push(makeCredentials('', raw, password));
    candidates.push(makeCredentials('', username, password));
    return uniqueCredentials(candidates);
  }

  // Bare username — attach default domain when configured
  if (fallback) {
    candidates.push(makeCredentials(fallback, raw, password));
  }
  candidates.push(makeCredentials('', raw, password));
  return uniqueCredentials(candidates);
}
