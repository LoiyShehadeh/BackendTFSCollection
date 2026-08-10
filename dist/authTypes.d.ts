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
 * Builds NTLM credential candidates from a login username (DOMAIN\user, user, or email/UPN).
 * Email domains are often not the Windows NetBIOS domain, so we also try the default domain.
 */
export declare function buildCredentialCandidates(usernameInput: string, password: string, defaultDomain?: string): UserCredentials[];
