// src/infrastructure/repositories/test_plan_repository.ts

import type { Pool } from 'pg';
import { injectable, inject } from 'inversify';
import { ITestPlanRepository } from "../../ports/i_test_plan_repository.js";
import { CreateTestPlanDTO, TestPlan, UpdateTestPlanDTO } from "../../domain/test_plan.js";
import { rowToTestPlan } from "../mappers.js";
import { TYPES } from '../../inversify.types.js';

@injectable()
export class TestPlanRepository implements ITestPlanRepository {

    constructor(@inject(TYPES.PostgresPool) private pool: Pool) { }

    async save(testPlan: CreateTestPlanDTO): Promise<TestPlan> {
        const { name, planType, status } = testPlan;
        const query = `
            INSERT INTO test_plans (name, plan_type, status)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [name, planType, status];
        const result = await this.pool.query(query, values);
        return rowToTestPlan(result.rows[0]);
    }

    async findById(id: string): Promise<TestPlan | null> {
        const query = 'SELECT * FROM test_plans WHERE id = $1;';
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) return null;
        return rowToTestPlan(result.rows[0]);
    }

    async update(testPlan: UpdateTestPlanDTO): Promise<TestPlan> {
        const { id, status, failureReason } = testPlan;
        const query = `
            UPDATE test_plans
            SET status = $1, updated_at = CURRENT_TIMESTAMP, failure_reason = $2
            WHERE id = $3
            RETURNING *;
        `;
        const values = [status, failureReason || null, id];
        const result = await this.pool.query(query, values);

        return rowToTestPlan(result.rows[0]);
    }

    async findAll(): Promise<TestPlan[]> {
        const query = 'SELECT * FROM test_plans ORDER BY created_at DESC;';
        const result = await this.pool.query(query);
        return result.rows.map(rowToTestPlan);
    }

    async deleteById(id: string): Promise<void> {
        const query = 'DELETE FROM test_plans WHERE id = $1;';
        const result = await this.pool.query(query, [id]);
    }
}