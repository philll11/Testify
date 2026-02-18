// src/infrastructure/repositories/test_plan_entry_point_repository.ts

import type { Pool } from 'pg';
import { injectable, inject } from 'inversify';
import { ITestPlanEntryPointRepository } from '../../ports/i_test_plan_entry_point_repository.js';
import { CreateTestPlanEntryPointDTO } from '../../domain/test_plan_entry_point.js';
import { TYPES } from '../../inversify.types.js';

@injectable()
export class TestPlanEntryPointRepository implements ITestPlanEntryPointRepository {
    constructor(@inject(TYPES.PostgresPool) private pool: Pool) { }

    async saveAll(entryPoints: CreateTestPlanEntryPointDTO[]): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (const entry of entryPoints) {
                const { testPlanId, componentId } = entry;
                const query = `
                    INSERT INTO test_plan_entry_points (test_plan_id, component_id)
                    VALUES ($1, $2);`;
                const values = [testPlanId, componentId];
                await client.query(query, values);
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}