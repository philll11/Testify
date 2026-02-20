export interface Credential {
    id: string;
    platform: string;
    profileName: string;
    accountId: string;
    username: string;
    executionInstanceId?: string;
}

export interface CreateCredentialPayload {
    platform?: string;
    profileName: string;
    accountId: string;
    username: string;
    passwordOrToken: string;
    executionInstanceId?: string;
}
