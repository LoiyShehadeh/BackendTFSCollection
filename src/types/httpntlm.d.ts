declare module 'httpntlm' {
  interface NtlmOptions {
    url: string;
    username: string;
    password: string;
    domain?: string;
    workstation?: string;
    headers?: Record<string, string>;
  }

  interface NtlmResponse {
    statusCode?: number;
    body?: string;
    headers?: Record<string, string>;
  }

  type NtlmCallback = (err: Error | null, response: NtlmResponse) => void;

  const httpntlm: {
    get: (options: NtlmOptions, callback: NtlmCallback) => void;
    post: (options: NtlmOptions, callback: NtlmCallback) => void;
  };

  export default httpntlm;
}
