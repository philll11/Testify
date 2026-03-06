import axiosServices from 'utils/axios';
import { TestRegistry, CreateTestRegistryDto, ImportTestRegistryDto } from '../../types/test-registry/test-registry.types';

const BASE_URL = '/test-registry';

export const getTestRegistries = async (profileId?: string): Promise<TestRegistry[]> => {
    const response = await axiosServices.get<TestRegistry[]>(profileId ? `${BASE_URL}?profileId=${profileId}` : BASE_URL);
    return response.data;
};

export const getTestRegistry = async (id: string): Promise<TestRegistry> => {
    const response = await axiosServices.get<TestRegistry>(`${BASE_URL}/${id}`);
    return response.data;
};

export const getTestRegistriesByTarget = async (targetId: string): Promise<TestRegistry[]> => {
    const response = await axiosServices.get<TestRegistry[]>(`${BASE_URL}/target/${targetId}`);
    return response.data;
};

export const createTestRegistry = async (data: CreateTestRegistryDto): Promise<TestRegistry> => {
    const response = await axiosServices.post<TestRegistry>(BASE_URL, data);
    return response.data;
};

export const updateTestRegistry = async (id: string, data: Partial<CreateTestRegistryDto>): Promise<TestRegistry> => {
    const response = await axiosServices.patch<TestRegistry>(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const deleteTestRegistry = async (id: string): Promise<void> => {
    await axiosServices.delete(`${BASE_URL}/${id}`);
};

export const importTestRegistry = async (data: ImportTestRegistryDto): Promise<any> => {
    const response = await axiosServices.post(`${BASE_URL}/import`, data);
    return response.data;
};

