import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationService } from './integration.service';
import { UserCredentialsService } from '../iam/users/user-credentials.service';
import { SystemConfigService } from '../system/config/system-config.service';
import { BoomiService } from './boomi/boomi.service';
import { IntegrationPlatform } from '../iam/users/entities/user-integration-credential.entity';
import { NotFoundException } from '@nestjs/common';
import { SystemConfigKeys } from '../common/constants/system-config.constants';

describe('IntegrationService', () => {
    let service: IntegrationService;
    let userCredentialsService: Partial<UserCredentialsService>;
    let systemConfigService: Partial<SystemConfigService>;

    beforeEach(async () => {
        // Mock UserCredentialsService
        userCredentialsService = {
            getDecryptedCredential: jest.fn(),
        };

        // Mock SystemConfigService
        systemConfigService = {
            get: jest.fn().mockImplementation((key) => {
                if (key === SystemConfigKeys.BOOMI.POLL_INTERVAL) return Promise.resolve({ value: '100' });
                if (key === SystemConfigKeys.BOOMI.MAX_POLLS) return Promise.resolve({ value: '5' });
                return Promise.resolve(null);
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IntegrationService,
                { provide: UserCredentialsService, useValue: userCredentialsService },
                { provide: SystemConfigService, useValue: systemConfigService },
            ],
        }).compile();

        service = module.get<IntegrationService>(IntegrationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getService', () => {
        it('should return a BoomiService instance when platform is BOOMI', async () => {
            const mockCreds = {
                platformName: IntegrationPlatform.BOOMI,
                accountId: 'test-account',
                username: 'user',
                passwordOrToken: 'pass',
                executionInstanceId: 'exec-1',
            };

            (userCredentialsService.getDecryptedCredential as jest.Mock).mockResolvedValue(mockCreds);

            const result = await service.getService('user-1', 'profile-1');

            expect(result).toBeInstanceOf(BoomiService);
            expect(userCredentialsService.getDecryptedCredential).toHaveBeenCalledWith('user-1', 'profile-1');
            expect(systemConfigService.get).toHaveBeenCalledWith(SystemConfigKeys.BOOMI.POLL_INTERVAL);
        });

        it('should throw NotFoundException if credentials are not found', async () => {
            (userCredentialsService.getDecryptedCredential as jest.Mock).mockResolvedValue(null);

            await expect(service.getService('user-1', 'missing-profile'))
                .rejects
                .toThrow(NotFoundException);
        });

        it('should throw Error for unsupported platforms', async () => {
            const mockCreds = {
                platformName: 'UNSUPPORTED_PLATFORM',
                accountId: 'test-account',
            };

            (userCredentialsService.getDecryptedCredential as jest.Mock).mockResolvedValue(mockCreds);

            await expect(service.getService('user-1', 'profile-1'))
                .rejects
                .toThrow('Unsupported integration platform: UNSUPPORTED_PLATFORM');
        });

        it('should support default platform fallback if platformName is missing', async () => {
            // Simulate legacy data where platformName might be missing from the decrypted payload
            const mockCreds = {
                // mechanism relies on Entity property, so if it's undefined/null
                platformName: undefined,
                accountId: 'test-account',
                username: 'user',
                passwordOrToken: 'pass',
                executionInstanceId: 'exec-1',
            };

            (userCredentialsService.getDecryptedCredential as jest.Mock).mockResolvedValue(mockCreds);

            const result = await service.getService('user-1', 'profile-1');

            // Should default to BoomiService
            expect(result).toBeInstanceOf(BoomiService);
        });
    });
});
