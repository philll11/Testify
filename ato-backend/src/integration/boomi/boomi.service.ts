import axios, { AxiosInstance } from 'axios';
import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  IIntegrationPlatformService,
  PlatformExecutionResult,
  ComponentInfo,
  ComponentSearchCriteria,
  PlatformConfig,
  TestCaseResult,
} from '../interfaces/integration-platform.interface';
import { IntegrationPlatformException } from '../exceptions/integration-platform.exception';

// --- Type Definitions for Boomi API Responses ---
interface ComponentMetadataResponse {
  componentId?: string; // Present in Query results
  name: string;
  version: number;
  type: string;
  folderId?: string; // Present in Query results
  folderName?: string;
}

interface BoomiQueryResponse<T> {
  numberOfResults: number;
  queryToken?: string;
  result?: T[];
}

interface ComponentReference {
  componentId: string;
}

interface ComponentReferenceResult {
  references?: ComponentReference[];
}

interface ComponentReferenceQueryResponse {
  numberOfResults: number;
  result?: ComponentReferenceResult[];
}

interface BoomiFolderResponse {
  id: string;
  name: string;
  parentFolderId?: string;
}

interface BoomiTestResultPayload {
  status: 'SUCCESS' | 'FAILURE';
  message: string;
  testCases: {
    testCaseId: string;
    testDescription: string;
    status: 'passed' | 'failed';
    details: string;
  }[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class BoomiService implements IIntegrationPlatformService {
  private apiClient: AxiosInstance;
  private readonly executionInstanceId: string;
  private pollInterval: number;
  private maxPolls: number;
  private readonly maxRetries: number;
  private readonly initialDelay: number;
  private readonly logger = new Logger(BoomiService.name);
  private folderCache = new Map<string, string>();

  constructor(
    credentials: {
      accountId: string;
      username: string;
      passwordOrToken: string;
      executionInstanceId: string;
    },
    config: PlatformConfig = {},
  ) {
    this.apiClient = axios.create({
      baseURL: `https://api.boomi.com/api/rest/v1/${credentials.accountId}`,
      auth: {
        username: credentials.username,
        password: credentials.passwordOrToken,
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    this.executionInstanceId = credentials.executionInstanceId;
    this.pollInterval = config.pollInterval ?? 2000; // 2 seconds
    this.maxPolls = config.maxPolls ?? 180;
    this.maxRetries = config.maxRetries ?? 5;
    this.initialDelay = config.initialDelay ?? 1000; // 1 second
  }

  // Generic method to handle retries with exponential backoff and jitter
  private async _requestWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status;
          if (status === 503 || status === 504 || status === 429) {
            // Rate Limit Exceeded or Gateway Timeout
            if (attempt === this.maxRetries) {
              // If it's the last attempt, give up and throw
              this.logger.error(
                `API request failed after ${this.maxRetries} attempts with status ${status}.`,
              );
              throw error;
            }
            // Calculate exponential backoff with jitter
            const delayMs =
              this.initialDelay * Math.pow(2, attempt - 1) +
              Math.random() * 1000;
            this.logger.warn(
              `API returned status ${status}. Retrying in ${Math.round(delayMs / 1000)}s... (Attempt ${attempt}/${this.maxRetries})`,
            );
            await delay(delayMs);
            continue;
          }
        }
        // For non-retryable errors, or if it's not an Axios error, re-throw immediately
        throw error;
      }
    }
    throw new Error('Unexpected retry loop exit');
  }

  async testConnection(): Promise<boolean> {
    try {
      // A simple call to get object definitions or verify account can be used.
      // As a proxy, let's try to query for a non-existent component or just check access.
      // Boomi doesn't check credentials until an API call is made.
      // We can try to query ComponentMetadata for a dummy ID to verify auth.
      /* 
               Better Approach: Query for 1 component. If 200 OK (even empty result), auth works.
               If 401/403, it fails.
            */
      await this._requestWithRetry(async () => {
        await this.apiClient.post('/ComponentMetadata/query', {
          QueryFilter: {
            expression: {
              operator: 'EQUALS',
              property: 'componentId',
              argument: ['00000000-0000-0000-0000-000000000000'], // Dummy ID
            },
          },
        });
      });
      return true;
    } catch (error) {
      this.logger.error('Test Connection Failed', error);
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        return false;
      }
      // Other errors (network, etc) might still mean connection failure
      return false;
    }
  }

  public async resolveFolderPath(folderId: string): Promise<string> {
    if (this.folderCache.has(folderId)) {
      return this.folderCache.get(folderId)!;
    }

    try {
      return await this._requestWithRetry(async () => {
        const response = await this.apiClient.get<BoomiFolderResponse>(
          `/Folder/${folderId}`,
        );

        let path = '';
        if (response.data.parentFolderId) {
          const parentPath = await this.resolveFolderPath(response.data.parentFolderId);
          path = `${parentPath}/${response.data.name}`;
        } else {
          path = `/${response.data.name}`;
        }

        this.folderCache.set(folderId, path);
        return path;
      });
    } catch (error) {
      this.logger.error(`Failed to resolve folder path for ${folderId}`, error);
      throw new IntegrationPlatformException(
        `Failed to resolve folder path for ${folderId}`,
      );
    }
  }

  private async _queryWithPagination<T>(endpoint: string, initialPayload: any): Promise<T[]> {
    let allResults: T[] = [];
    let queryToken: string | undefined = undefined;

    // Initial Query
    const initialResponse = await this._requestWithRetry(async () => {
      return await this.apiClient.post<BoomiQueryResponse<T>>(
        `${endpoint}/query`,
        initialPayload,
      );
    });

    if (initialResponse.data.result) {
      allResults = allResults.concat(initialResponse.data.result);
    }
    queryToken = initialResponse.data.queryToken;

    // Paging Loop
    while (queryToken) {
      const token = queryToken;
      const moreResponse = await this._requestWithRetry(async () => {
        // Boomi queryMore expects the raw token string in the body
        return await this.apiClient.post<BoomiQueryResponse<T>>(
          `${endpoint}/queryMore`,
          token,
        );
      });

      if (moreResponse.data.result) {
        allResults = allResults.concat(moreResponse.data.result);
      }
      queryToken = moreResponse.data.queryToken;
    }

    return allResults;
  }

  public async searchComponents(criteria: ComponentSearchCriteria): Promise<ComponentInfo[]> {
    const globalFilters: any[] = [];

    // 1. Global Filters (AND)
    // Always filter for non-deleted and current version to ensure we get valid executable artifacts
    globalFilters.push({
      operator: 'EQUALS',
      property: 'deleted',
      argument: ['false'],
    });
    globalFilters.push({
      operator: 'EQUALS',
      property: 'currentVersion',
      argument: ['true'],
    });

    if (criteria.types && criteria.types.length > 0) {
      globalFilters.push({
        operator: 'EQUALS',
        property: 'type',
        argument: criteria.types,
      });
    }

    // 2. Search Criteria (OR) combined into one block
    const orCriteria: any[] = [];

    if (criteria.folderNames && criteria.folderNames.length > 0) {
      orCriteria.push({
        operator: 'EQUALS',
        property: 'folderName',
        argument: criteria.folderNames,
      });
    }

    if (criteria.names && criteria.names.length > 0) {
      const operator = criteria.exactNameMatch === false ? 'LIKE' : 'EQUALS';
      orCriteria.push({
        operator: operator,
        property: 'name',
        argument: criteria.names,
      });
    }

    if (criteria.ids && criteria.ids.length > 0) {
      // Boomi Constraint: Use OR + nested EQUALS for multiple ID matching to act as IN
      const idOrFilters = criteria.ids.map((id) => ({
        operator: 'EQUALS',
        property: 'componentId',
        argument: [id],
      }));

      orCriteria.push({
        operator: 'or',
        nestedExpression: idOrFilters,
      });
    }

    // Only add the OR block if we have criteria
    if (orCriteria.length > 0) {
      globalFilters.push({
        operator: 'or',
        nestedExpression: orCriteria,
      });
    }

    const payload = {
      QueryFilter: {
        expression: {
          operator: 'and',
          nestedExpression: globalFilters,
        },
      },
    };

    const results = await this._queryWithPagination<ComponentMetadataResponse>(
      '/ComponentMetadata',
      payload,
    );

    return results.map((r) => ({
      id: r.componentId!,
      name: r.name,
      type: r.type,
      folderId: r.folderId,
      folderName: r.folderName,
      dependencyIds: [],
    }));
  }

  private async getComponentMetadata(componentId: string): Promise<ComponentMetadataResponse | null> {
    // console.log(`[ADAPTER] getComponentVersion called for component: ${componentId}`);

    try {
      return await this._requestWithRetry(async () => {
        // console.log(`[ADAPTER] Fetching metadata for component: ${componentId}`);
        const response = await this.apiClient.get<ComponentMetadataResponse>(
          `/ComponentMetadata/${componentId}`,
        );
        return response.data;
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if ([401, 403].includes(status)) {
          throw new UnauthorizedException(
            'Boomi API authentication failed. Please check your credentials.',
          );
        }
        if (status === 400 || status === 404) {
          console.warn(
            `Component with ID ${componentId} not found. It will be treated as having no dependencies.`,
          );
          return null;
        }
      }
      // For any other error, wrap it in our custom error type for better logging
      const message =
        error instanceof Error ? error.message : 'An unknown error occurred';
      throw new IntegrationPlatformException(
        `Failed to fetch metadata for component ${componentId}: ${message}`,
      );
    }
  }

  public async getComponentInfo(componentId: string): Promise<ComponentInfo | null> {
    const metadata = await this.getComponentMetadata(componentId);
    if (metadata === null) return null;

    return {
      id: componentId,
      name: metadata.name,
      type: metadata.type,
      dependencyIds: [],
    };
  }

  public async getComponentInfoAndDependencies(componentId: string): Promise<ComponentInfo | null> {
    const metadata = await this.getComponentMetadata(componentId);
    if (metadata === null) return null; // Component not found, return null

    try {
      // Fetch dependencies for component: ${componentId}
      const results = await this._queryWithPagination<ComponentReferenceResult>(
        '/ComponentReference',
        {
          QueryFilter: {
            expression: {
              operator: 'and',
              nestedExpression: [
                {
                  operator: 'EQUALS',
                  property: 'parentComponentId',
                  argument: [componentId],
                },
                {
                  operator: 'EQUALS',
                  property: 'parentVersion',
                  argument: [metadata.version],
                },
              ],
            },
          },
        },
      );

      const dependencyIds = results.length === 0 ? [] : results.flatMap(
        (resultItem) => resultItem.references ? resultItem.references.map((ref) => ref.componentId) : [],
      );

      // Return the combined object
      return {
        id: componentId,
        name: metadata.name,
        type: metadata.type,
        dependencyIds: dependencyIds,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unknown error occurred';
      throw new IntegrationPlatformException(
        `Failed to fetch dependencies for component ${componentId}: ${message}`,
      );
    }
  }

  /**
   * Helper: Attempts to parse a JSON string extracted from a Boomi error message.
   * Returns the array of test cases if valid, or null if parsing fails.
   */
  private tryParseTestResult(errorMessage: string): TestCaseResult[] | null {
    try {
      const parsed = JSON.parse(errorMessage) as BoomiTestResultPayload;

      if (parsed && Array.isArray(parsed.testCases)) {
        // Map to internal Domain format
        return parsed.testCases.map((tc) => ({
          testCaseId: tc.testCaseId,
          testDescription: tc.testDescription,
          status:
            tc.status && tc.status.toUpperCase() === 'PASSED'
              ? 'PASSED'
              : 'FAILED',
          details: tc.details,
        }));
      }
      return null;
    } catch (e) {
      // Parsing failed, likely a standard plain-text error message
      return null;
    }
  }

  public async executeTestProcess(componentId: string): Promise<PlatformExecutionResult> {
    try {
      const initResponse = await this._requestWithRetry(async () => {
        const executionRequest = {
          '@type': 'ExecutionRequest',
          atomId: this.executionInstanceId,
          processId: componentId,
        };
        return await this.apiClient.post('/ExecutionRequest', executionRequest);
      });

      const requestId = initResponse.data.requestId;
      const recordUrl = initResponse.data.recordUrl; // For the final log URL

      if (!requestId)
        throw new Error('Execution initiation failed to return a requestId.');

      let pollCount = 0;

      while (pollCount < this.maxPolls) {
        const pollResponse = await this.apiClient.get(
          `/ExecutionRecord/async/${requestId}`,
        );

        if (pollResponse.data.responseStatusCode === 200) {
          const executionRecord = pollResponse.data.result?.[0];
          if (!executionRecord) {
            return {
              status: 'FAILURE',
              message: 'Execution completed but no result record was found.',
            };
          }

          const currentStatus = executionRecord.status;

          // Check for terminal success or failure states
          if (currentStatus === 'COMPLETE') {
            return {
              status: 'SUCCESS',
              message: 'Execution completed successfully.',
              executionLogUrl: recordUrl,
            };
          }

          if (currentStatus === 'ERROR') {
            const rawMessage = executionRecord.message || '';

            const testCases = this.tryParseTestResult(rawMessage);

            if (testCases) {
              return {
                status: 'FAILURE',
                message: 'Test execution completed with assertion failures.',
                executionLogUrl: recordUrl,
                testCases: testCases,
              };
            }

            // Fallback to generic error
            return {
              status: 'FAILURE',
              message: `Execution failed with message: ${rawMessage}`,
              executionLogUrl: recordUrl,
            };
          }
        }

        pollCount++;
        await delay(this.pollInterval);
      }

      return {
        status: 'FAILURE',
        message: 'Execution timed out while polling for a result.',
      };
    } catch (error) {
      if (error instanceof IntegrationPlatformException) {
        return { status: 'FAILURE', message: error.message };
      }
      const message =
        error instanceof Error
          ? error.message
          : 'An unknown error occurred during execution.';
      return { status: 'FAILURE', message };
    }
  }
}
