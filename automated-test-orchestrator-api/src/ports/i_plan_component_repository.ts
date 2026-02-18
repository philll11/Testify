// src/ports/i_plan_component_repository.ts

import { CreatePlanComponentDTO, PlanComponent } from "../domain/plan_component.js";

export interface IPlanComponentRepository {
  saveAll(components: CreatePlanComponentDTO[]): Promise<void>;
  findByTestPlanId(testPlanId: string): Promise<PlanComponent[]>;
  update(component: PlanComponent): Promise<PlanComponent>;
}