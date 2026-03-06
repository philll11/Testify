export interface TestRegistry {
  id: string;
  profileId: string;
  targetComponentId: string;
  targetComponentName?: string;
  targetComponentPath?: string;
  testComponentId: string;
  testComponentName?: string;
  testComponentPath?: string;
  isActive?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateTestRegistryDto {
  profileId: string;
  targetComponentId: string;
  targetComponentName?: string;
  targetComponentPath?: string;
  testComponentId: string;
  testComponentName?: string;
  testComponentPath?: string;
  environmentId?: string;
}

export interface UpdateTestRegistryDto {
  targetComponentId?: string;
  testComponentId?: string;
  isActive?: boolean;
}

export interface ImportTestRegistryDto {
  environmentId: string;
  mappings: CreateTestRegistryDto[];
}
