import axiosServices from 'utils/axios';
import { ComponentTreeNode, GetDiscoveryComponentsDto } from 'types/discovery/discovery';

const DISCOVERY_URL = '/discovery';

export const getDiscoveryComponents = async (params?: GetDiscoveryComponentsDto): Promise<ComponentTreeNode[]> => {
  const response = await axiosServices.get<ComponentTreeNode[]>(`${DISCOVERY_URL}/components`, {
    params
  });
  return response.data;
};

export const triggerSync = async (): Promise<any> => {
  const response = await axiosServices.post('/system/sync');
  return response.data;
};
