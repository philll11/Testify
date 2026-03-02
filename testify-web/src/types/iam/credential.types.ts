export enum IntegrationPlatform {
  BOOMI = 'Boomi'
}

export interface Credential {
  id: string;
  platform: IntegrationPlatform;
  profileName: string;
  accountId: string;
  username: string;
  executionInstanceId?: string;
}

export interface CreateCredentialPayload {
  platform?: IntegrationPlatform;
  profileName: string;
  accountId: string;
  username: string;
  passwordOrToken: string;
  executionInstanceId?: string;
}
