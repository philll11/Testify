// Collection Types

export enum CollectionType {
  TARGETS = 'TARGETS',
  TESTS = 'TESTS'
}

export enum CollectionStatus {
  DRAFT = 'DRAFT',
  AWAITING_SELECTION = 'AWAITING_SELECTION',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  componentId: string;
  sourceType: string;
  // Based on the Master JOIN, it may contain the nested DiscoveredComponent or test mappings
  targetComponent?: any;
  tests?: any[];
}

export interface Collection {
  id: string;
  name: string;
  collectionType: CollectionType;
  status: CollectionStatus;
  environmentId?: string;
  failureReason?: string;
  items: CollectionItem[];
  manifest?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionDto {
  name: string;
  collectionType: CollectionType;
  environmentId?: string;
  componentIds: string[];
  crawlDependencies?: boolean;
}
