export enum TestResultStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    PASSED = 'PASSED',
    FAILED = 'FAILED',
    ERROR = 'ERROR'
}

export interface TestResult {
    id: string;
    collectionId: string;
    testId: string;
    externalExecutionId?: string;
    status: TestResultStatus;
    rawResult?: any;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    // Enriched
    testName?: string;
    testPath?: string;
    platformType?: string;
}

export interface TestResultQuery {
    collectionId?: string;
    status?: TestResultStatus;
}
