// src/integration/boomi/boomi.service.spec.ts
import { AxiosInstance } from 'axios';
import { BoomiService } from './boomi.service';
import { IntegrationPlatformException } from '../exceptions/integration-platform.exception';
import { UnauthorizedException } from '@nestjs/common';

// Use jest.mock to hoist the mock creation before imports usage
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      defaults: { headers: { common: {} } },
    })),
    isAxiosError: jest.fn((payload) => payload?.isAxiosError === true),
  };
});

import axios from 'axios';

describe('BoomiService', () => {
  let service: BoomiService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementation for each test
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    service = new BoomiService(
      {
        accountId: 'test-account',
        username: 'user',
        passwordOrToken: 'token',
        executionInstanceId: 'atom-1',
      },
      {
        pollInterval: 10, // Fast polling for tests
        maxRetries: 3,
        initialDelay: 10, // Fast retry for tests
      },
    );
  });

  describe('testConnection', () => {
    it('should return true on successful API call', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200, data: {} });
      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on 401 Unauthorized', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        isAxiosError: true,
        response: { status: 401 },
      });
      const result = await service.testConnection();
      expect(result).toBe(false);
    });

    it('should return false on 403 Forbidden', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        isAxiosError: true,
        response: { status: 403 },
      });
      const result = await service.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getComponentInfo', () => {
    it('should return component info when found', async () => {
      const mockResponse = {
        data: {
          componentId: 'comp-123',
          name: 'Test Process',
          version: 1,
          type: 'Process',
          folderId: 'folder-1',
          folderName: 'My Folder',
        },
      };
      // getComponentMetadata uses GET request, not POST
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getComponentInfo('comp-123');

      expect(result).toEqual({
        id: 'comp-123',
        name: 'Test Process',
        type: 'Process',
        dependencyIds: [],
      });
    });

    it('should return null when 404/400 returned', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
      });
      const result = await service.getComponentInfo('missing-id');
      expect(result).toBeNull();
    });

    it('should throw IntegrationPlatformException on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));
      await expect(service.getComponentInfo('comp-123')).rejects.toThrow(
        IntegrationPlatformException,
      );
    });
  });

  describe('executeTestProcess', () => {
    it('should poll until completion and return success', async () => {
      // 1. Initial Execution request returns request ID
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { requestId: 'req-123', recordUrl: 'http://logs' },
      });

      // 2. Poll 1: PENDING
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { responseStatusCode: 200, result: [{ status: 'PENDING' }] },
      });

      // 3. Poll 2: COMPLETE
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { responseStatusCode: 200, result: [{ status: 'COMPLETE' }] },
      });

      const result = await service.executeTestProcess('process-1');

      expect(result.status).toBe('SUCCESS');
      expect(result.executionLogUrl).toBe('http://logs');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should return FAILURE if execution ends in ERROR status', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { requestId: 'req-123' },
      });

      // Poll: ERROR with message
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          responseStatusCode: 200,
          result: [{ status: 'ERROR', message: 'Something went wrong' }],
        },
      });

      const result = await service.executeTestProcess('process-1');

      expect(result.status).toBe('FAILURE');
      expect(result.message).toContain('Execution failed');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 503 Service Unavailable', async () => {
      // Fail twice with 503, then succeed
      const error503 = {
        isAxiosError: true,
        response: { status: 503 },
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(error503)
        .mockRejectedValueOnce(error503)
        .mockResolvedValue({ status: 200, data: {} });

      await service.testConnection();

      // Initial + 2 retries = 3 calls
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries are exhausted', async () => {
      const error503 = {
        isAxiosError: true,
        response: { status: 503 },
      };

      // Needs to fail more times than maxRetries (3 configured in test)
      // Using `post` via `executeTestProcess` which definitely calls post
      // mockAxiosInstance.post is used in `executeTestProcess` initial call
      mockAxiosInstance.post.mockRejectedValue(error503);

      // Using executeTestProcess because testConnection suppresses errors (returns false)
      // executeTestProcess relies on POST /ExecutionRequest
      // But executeTestProcess catches errors and returns a FAILURE result, so we expect a resolved promise
      const result = await service.executeTestProcess('id');

      expect(result.status).toBe('FAILURE');
      // configured maxRetries=3 is treated as maxAttempts in implementation
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });
  });
});
