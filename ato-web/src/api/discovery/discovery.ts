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

export const triggerSync = async (): Promise<any> => {
  const response = await axiosServices.post('/system/sync');
  return response.data;
};
