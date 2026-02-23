import { Exclude, Expose } from 'class-transformer';
import { IntegrationPlatform } from '../../constants/integration-platform.enum';
import { PlatformEnvironment } from '../entities/platform-environment.entity';

export class PlatformEnvironmentResponseDto {
    id: string;

    name: string;

    description: string;

    platformType: IntegrationPlatform;

    profileId: string;

    createdAt: Date;

    updatedAt: Date;

    @Expose()
    credentials?: Record<string, any>;

    constructor(partial: Partial<PlatformEnvironmentResponseDto>) {
        Object.assign(this, partial);
    }

    static fromEntity(
        entity: PlatformEnvironment,
        credentials?: Record<string, any>,
    ): PlatformEnvironmentResponseDto {
        const dto = new PlatformEnvironmentResponseDto({
            id: entity.id,
            name: entity.name,
            description: entity.description,
            platformType: entity.platformType,
            profileId: entity.profileId,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
            credentials: credentials,
        });
        return dto;
    }
}
