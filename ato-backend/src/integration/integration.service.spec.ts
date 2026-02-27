import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationService } from './integration.service';
import { PlatformEnvironmentService } from './platform-environment/platform-environment.service';
import { PlatformProfileService } from './platform-profile/platform-profile.service';
import { BoomiService } from './boomi/boomi.service';
import { IntegrationPlatform } from './constants/integration-platform.enum';
import { NotFoundException } from '@nestjs/common';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let environmentService: Partial<PlatformEnvironmentService>;
  let profileService: Partial<PlatformProfileService>;

  const mockEnv = {
    id: 'env-1',
    name: 'env-prod',
    platformType: IntegrationPlatform.BOOMI,
    profile: {
      id: 'profile-1',
      name: 'profile-std',
      platformType: IntegrationPlatform.BOOMI,
      config: { pollInterval: 500, maxPolls: 5 },
      isDefault: false,
      // ... other fields
    } as any,
    // ... other fields
  };

  const mockCreds = {
    accountId: 'test-account',
    username: 'user',
    passwordOrToken: 'pass',
    executionInstanceId: 'exec-1',
  };

  beforeEach(async () => {
    environmentService = {
      findByName: jest.fn(),
      getDecryptedCredentials: jest.fn(),
    };

    profileService = {}; // Not used directly in getService anymore if we rely on env.profile

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: PlatformEnvironmentService, useValue: environmentService },
        { provide: PlatformProfileService, useValue: profileService },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getService', () => {
    it('should return a BoomiService instance when platform is BOOMI', async () => {
      (environmentService.findByName as jest.Mock).mockResolvedValue(mockEnv);
      (
        environmentService.getDecryptedCredentials as jest.Mock
      ).mockResolvedValue(mockCreds);

      const result = await service.getService('unused', 'env-prod');

      expect(result).toBeInstanceOf(BoomiService);
      expect(environmentService.findByName).toHaveBeenCalledWith('env-prod');
      expect(environmentService.getDecryptedCredentials).toHaveBeenCalledWith(
        'env-1',
      );
    });

    it('should throw NotFoundException if environment not found', async () => {
      (environmentService.findByName as jest.Mock).mockResolvedValue(null);

      await expect(service.getService('unused', 'bad-env')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw Error if environment has no profile', async () => {
      const badEnv = { ...mockEnv, profile: null };
      (environmentService.findByName as jest.Mock).mockResolvedValue(badEnv);
      (
        environmentService.getDecryptedCredentials as jest.Mock
      ).mockResolvedValue(mockCreds);

      await expect(service.getService('unused', 'env-prod')).rejects.toThrow(
        /no linked profile/,
      );
    });
  });
});
