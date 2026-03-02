import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDiscoveryComponents, triggerSync, getSyncStatus, getSyncActive } from 'api/discovery/discovery';
import { GetDiscoveryComponentsDto } from 'types/discovery/discovery';
import { useEffect, useRef } from 'react';
import { useSnackbar } from 'contexts/SnackbarContext';

// Keys for the Discovery API
export const discoveryKeys = {
  all: ['discovery'] as const,
  components: () => [...discoveryKeys.all, 'components'] as const,
  componentsList: (params?: GetDiscoveryComponentsDto) => [...discoveryKeys.components(), params] as const,
  syncStatus: () => [...discoveryKeys.all, 'syncStatus'] as const,
  syncActive: () => [...discoveryKeys.all, 'syncActive'] as const
};

// Hook for fetching nested component trees
export function useDiscoveryComponents(params?: GetDiscoveryComponentsDto) {
  return useQuery({
    queryKey: discoveryKeys.componentsList(params),
    queryFn: () => getDiscoveryComponents(params),
    enabled: !!params?.profileId
  });
}

// Hook for fetching sync status
export function useSyncStatus() {
  return useQuery({
    queryKey: discoveryKeys.syncStatus(),
    queryFn: getSyncStatus
  });
}

// Hook for triggering manual sync
export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      // Invalidate the discovery trees so it refetches and also checks active status
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    }
  });
}

// Global Poll Hook
export function useGlobalSyncState() {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();
  const previousState = useRef<boolean>(false);

  const query = useQuery({
    queryKey: discoveryKeys.syncActive(),
    queryFn: getSyncActive,
    refetchInterval: (query) => (query.state.data?.isRunning ? 10000 : false)
  });

  const isRunning = !!query.data?.isRunning;

  useEffect(() => {
    if (previousState.current && !isRunning) {
      showMessage('Database Component Sync is complete', 'success');
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    }
    previousState.current = isRunning;
  }, [isRunning, showMessage, queryClient]);

  return {
    isRunning,
    ...query
  };
}
