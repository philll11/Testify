import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestResult } from './entities/test-result.entity';
import { TestResultQueryDto } from './dto/test-result-query.dto';
import { DiscoveredComponent } from '../discovery/entities/discovered-component.entity';

@Injectable()
export class TestResultsService {
    constructor(
        @InjectRepository(TestResult)
        private readonly testResultRepo: Repository<TestResult>,
        @InjectRepository(DiscoveredComponent)
        private readonly discoveredComponentRepo: Repository<DiscoveredComponent>,
    ) { }

    async findEnrichedResults(query: TestResultQueryDto): Promise<any[]> {
        const queryBuilder = this.testResultRepo.createQueryBuilder('tr');

        if (query.collectionId) {
            queryBuilder.andWhere('tr.collectionId = :collectionId', { collectionId: query.collectionId });
        }

        if (query.status) {
            queryBuilder.andWhere('tr.status = :status', { status: query.status });
        }

        const results = await queryBuilder.getMany();

        if (results.length === 0) {
            return [];
        }

        const testIds = results.map(r => r.testId);

        // Fetch component metadata to enrich the report
        const components = await this.discoveredComponentRepo.createQueryBuilder('dc')
            .where('dc.componentId IN (:...testIds)', { testIds })
            .getMany();

        // Create a map for quick lookup
        const componentMap = new Map();
        components.forEach(c => {
            componentMap.set(c.componentId, c);
        });

        // Map and format results
        return results.map(result => {
            const comp = componentMap.get(result.testId);
            return {
                ...result,
                testName: comp ? comp.name : 'Unknown Test',
                testPath: comp ? comp.path : 'Unknown Path',
                platformType: comp ? comp.type : 'Unknown Platform',
            };
        });
    }
}
