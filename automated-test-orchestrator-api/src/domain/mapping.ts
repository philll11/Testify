// src/domain/mapping.ts

export interface Mapping {
  id: string;
  mainComponentId: string;
  mainComponentName?: string;
  testComponentId: string;
  testComponentName?: string;
  isDeployed?: boolean;
  isPackaged?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateMappingDTO = Omit<Mapping, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMappingDTO = Partial<Omit<Mapping, 'id' | 'mainComponentId' | 'createdAt' | 'updatedAt'>>;