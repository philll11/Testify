export interface TestRegistry {
  id: string;
  targetComponentId: string;
  testComponentId: string;
  isActive?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateTestRegistryDto {
  targetComponentId: string;
  testComponentId: string;
}

export interface UpdateTestRegistryDto {
  targetComponentId?: string;
  testComponentId?: string;
  isActive?: boolean;
}

export interface ImportTestRegistryDto {
  mappings: CreateTestRegistryDto[];
}
