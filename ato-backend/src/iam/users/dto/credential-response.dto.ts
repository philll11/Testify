import { Exclude, Expose } from 'class-transformer';
import { IntegrationPlatform } from '../entities/user-integration-credential.entity';

@Exclude()
export class CredentialResponseDto {
  @Expose()
  id: string;

  @Expose()
  platform: IntegrationPlatform;

  @Expose()
  profileName: string;

  @Expose()
  accountId: string;

  @Expose()
  username: string;

  @Expose()
  executionInstanceId: string;

  constructor(partial: Partial<CredentialResponseDto>) {
    Object.assign(this, partial);
  }
}
