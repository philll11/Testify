import axiosServices from 'utils/axios';
import { ComponentTreeNode, GetDiscoveryComponentsDto } from 'types/discovery/discovery';

const DISCOVERY_URL = '/discovery';

export const getDiscoveryComponents = async (params?: GetDiscoveryComponentsDto): Promise<ComponentTreeNode[]> => {
  const perfKey = `[API Fetch] getDiscoveryComponents (search: ${params?.search || 'none'})`;
  console.time(perfKey);
  const response = await axiosServices.get<{ data: ComponentTreeNode[] }>(`${DISCOVERY_URL}/components`, {
    params
  });
  console.timeEnd(perfKey);
  return response.data.data;
};

export const getSyncStatus = async (): Promise<{ lastSyncDate: string | null }> => {
  const response = await axiosServices.get<{ lastSyncDate: string | null }>('/system/sync');
  return response.data;
};

export const getSyncActive = async (): Promise<{ isRunning: boolean; progress?: number; totalCount?: number }> => {
  const response = await axiosServices.get<{ isRunning: boolean; progress?: number; totalCount?: number }>('/system/sync/active');
  return response.data;
};

export const triggerSync = async (data?: { environmentId?: string }): Promise<any> => {
  const response = await axiosServices.post('/system/sync', data || {});
  return response.data;
};
