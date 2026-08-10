export type TfsAuthMode = 'ntlm' | 'basic';
/**
 * Application configuration loaded from environment variables.
 * TFS user credentials are per-login session — not taken from .env.
 */
export declare const config: {
    port: number;
    corsOrigin: string;
    databasePath: string;
    sessionSecret: string;
    tfs: {
        /** Prefer ntlm for on-prem TFS/IIS Windows auth. */
        authMode: TfsAuthMode;
        /** NetBIOS domain used when login is email or bare username (e.g. REALSOFT-ME). */
        defaultDomain: string;
        sources: {
            tfs2018: {
                id: 'tfs2018';
                label: string;
                baseUrl: string;
            };
            tfs2017: {
                id: 'tfs2017';
                label: string;
                baseUrl: string;
            };
        };
    };
};
export type TfsSourceId = keyof typeof config.tfs.sources;
