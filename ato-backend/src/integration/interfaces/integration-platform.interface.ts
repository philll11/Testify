import { PlatformExecutionResult } from './test-execution-result.interface';
import { TestCaseResult } from './test-execution-result.interface';

export type { PlatformExecutionResult } from './test-execution-result.interface';
export type { TestCaseResult } from './test-execution-result.interface';

export interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  folderId?: string; // Often null/undefined for root components
  folderName?: string;
  dependencyIds: string[]; // Flat list of direct dependency IDs
}

export interface ComponentSearchCriteria {
  ids?: string[];
  names?: string[];
  folderNames?: string[];
  types?: string[];
  exactNameMatch?: boolean;
}

export interface IIntegrationPlatformService {
  /**
   * Retrieves metadata for a single component, without its dependencies.
   * @param componentId The ID of the component to look up.
   */
  getComponentInfo(componentId: string): Promise<ComponentInfo | null>;

  /**
   * Retrieves metadata for a component AND the IDs of its direct dependencies.
   * @param componentId The ID of the component to look up.
   */
  getComponentInfoAndDependencies(
    componentId: string,
  ): Promise<ComponentInfo | null>;

  /**
   * Executes a test process and polls for the result.
   * @param componentId The ID of the test process component to execute.
   */
  executeTestProcess(componentId: string): Promise<PlatformExecutionResult>;

  /**
   * Searches for components matching the criteria.
   * Automatically handles pagination to return all matching results.
   */
  searchComponents(criteria: ComponentSearchCriteria): Promise<ComponentInfo[]>;

  /**
   * Tests the connection to the platform using the stored credentials.
   * @returns true if connection is successful, false otherwise.
   */
  testConnection(): Promise<boolean>;
}

export interface PlatformConfig {
  pollInterval?: number;
  maxPolls?: number;
  maxRetries?: number;
  initialDelay?: number;
}
