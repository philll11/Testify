// Types
import { BaseEntity } from 'types/models';
import axios from 'utils/axios';

export interface SystemConfig<T = any> extends BaseEntity {
  key: string;
  value: T;
  description?: string;
}

export interface UpdateSystemConfigDto {
  value: any;
}

export interface AuditConfig {
  enabled: boolean;
}

export interface BoomiConfig {
  pollInterval: number; // in milliseconds
  maxPolls: number;
}

export interface DiscoveryConfig {
  componentTypes: string[];
  testDirectoryFolderName: string | null;
  defaultSyncEnvironmentId: string | null;
  syncScheduleCron: string;
  isSyncActive?: boolean;
}

export const SystemConfigKeys = {
  AUDIT: 'audit',
  BOOMI_POLL_INTERVAL: 'boomi.pollInterval',
  BOOMI_MAX_POLLS: 'boomi.maxPolls',
  DISCOVERY: 'discovery'
};

// API Functions
export const getSystemConfig = async <T>(key: string): Promise<SystemConfig<T>> => {
  const response = await axios.get<SystemConfig<T>>(`/system/config/${key}`);
  return response.data;
};

export const updateSystemConfig = async ({ key, data }: { key: string; data: UpdateSystemConfigDto }): Promise<void> => {
  await axios.patch(`/system/config/${key}`, data);
};
