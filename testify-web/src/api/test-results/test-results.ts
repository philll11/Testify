import axiosServices from 'utils/axios';
import { TestResult, TestResultQuery } from '../../types/test-results/test-result.types';

export const getTestResults = async (query?: TestResultQuery): Promise<TestResult[]> => {
    const params = new URLSearchParams();
    if (query?.collectionId) params.append('collectionId', query.collectionId);
    if (query?.status) params.append('status', query.status);

    const response = await axiosServices.get<TestResult[]>('/test-results', { params });
    return response.data;
};
