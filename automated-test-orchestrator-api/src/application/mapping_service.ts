// src/application/mapping_service.ts

import { injectable, inject } from 'inversify';
import { IMappingService } from '../ports/i_mapping_service.js';
import { IMappingRepository, CreateMappingDTO, UpdateMappingDTO } from '../ports/i_mapping_repository.js';
import { Mapping } from '../domain/mapping.js';
import { TYPES } from '../inversify.types.js';
import { ConflictError } from '../utils/app_error.js';

@injectable()
export class MappingService implements IMappingService {
    constructor(
        @inject(TYPES.IMappingRepository) private mappingRepository: IMappingRepository
    ) { }

    async createMapping(mappingData: CreateMappingDTO): Promise<Mapping> {
        // Check for existing mapping with the same mainComponentId and testComponentId
        const existingMapping = await this.mappingRepository.findByComponentIds(mappingData.mainComponentId, mappingData.testComponentId);
        if (existingMapping) {
            throw new ConflictError(`A mapping with mainComponentId '${mappingData.mainComponentId}' and testComponentId '${mappingData.testComponentId}' already exists.`);
        }

        return this.mappingRepository.create(mappingData);
    }

    async getMappingById(id: string): Promise<Mapping | null> {
        return this.mappingRepository.findById(id);
    }

    async getMappingsByMainComponentId(mainComponentId: string): Promise<Mapping[]> {
        return this.mappingRepository.findByMainComponentId(mainComponentId);
    }

    async getAllMappings(): Promise<Mapping[]> {
        return this.mappingRepository.findAll();
    }

    async updateMapping(id: string, updateData: UpdateMappingDTO): Promise<Mapping | null> {
        return this.mappingRepository.update(id, updateData);
    }

    async deleteMapping(id: string): Promise<boolean> {
        return this.mappingRepository.delete(id);
    }
}