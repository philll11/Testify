// src/ports/i_test_plan_repository.ts

import { CreateTestPlanDTO, TestPlan, UpdateTestPlanDTO } from "../domain/test_plan.js";

export interface ITestPlanRepository {
  save(testPlan: CreateTestPlanDTO): Promise<TestPlan>;
  findById(id: string): Promise<TestPlan | null>;
  update(testPlan: UpdateTestPlanDTO): Promise<TestPlan>;
  findAll(): Promise<TestPlan[]>;
  deleteById(id: string): Promise<void>;
}