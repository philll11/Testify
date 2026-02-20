import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CredentialResponseDto {
  @Expose()
  id: string;

  @Expose()
  platform: string;

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
