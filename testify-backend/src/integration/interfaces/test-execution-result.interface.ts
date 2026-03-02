export interface TestCaseResult {
  testCaseId?: string;
  testDescription: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
}

export interface PlatformExecutionResult {
  status: 'SUCCESS' | 'FAILURE';
  message: string;
  executionLogUrl?: string; // Optional URL to external logs
  testCases?: TestCaseResult[];
}
