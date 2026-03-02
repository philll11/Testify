import axiosServices from 'utils/axios';
import { PlatformEnvironment, CreatePlatformEnvironmentDto, UpdatePlatformEnvironmentDto } from 'types/platform/environments';

// --- API Functions ---

const ENVIRONMENTS_URL = '/platform-environments';

export const getPlatformEnvironments = async (): Promise<PlatformEnvironment[]> => {
  const response = await axiosServices.get<PlatformEnvironment[]>(ENVIRONMENTS_URL);
  return response.data;
};

export const getPlatformEnvironment = async (id: string): Promise<PlatformEnvironment> => {
  const response = await axiosServices.get<PlatformEnvironment>(`${ENVIRONMENTS_URL}/${id}`);
  return response.data;
};

export const createPlatformEnvironment = async (data: CreatePlatformEnvironmentDto): Promise<PlatformEnvironment> => {
  const response = await axiosServices.post<PlatformEnvironment>(ENVIRONMENTS_URL, data);
  return response.data;
};

export const updatePlatformEnvironment = async ({
  id,
  data
}: {
  id: string;
  data: UpdatePlatformEnvironmentDto;
}): Promise<PlatformEnvironment> => {
  const response = await axiosServices.patch<PlatformEnvironment>(`${ENVIRONMENTS_URL}/${id}`, data);
  return response.data;
};

export const deletePlatformEnvironment = async (id: string): Promise<void> => {
  await axiosServices.delete(`${ENVIRONMENTS_URL}/${id}`);
};

export const testPlatformEnvironmentConnection = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await axiosServices.post<{ success: boolean; message: string }>(`${ENVIRONMENTS_URL}/${id}/test-connection`);
  return response.data;
};
