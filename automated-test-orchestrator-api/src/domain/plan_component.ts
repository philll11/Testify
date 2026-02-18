// src/domain/plan_component.ts

export type CreatePlanComponentDTO = Omit<PlanComponent, 'id'>;

export interface PlanComponent {
  id: string;
  testPlanId: string;
  sourceType: string;
  componentId: string;
  componentName?: string;
  componentType?: string;
}