import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDiscoveryComponents, triggerSync, getSyncStatus } from 'api/discovery/discovery';
import { GetDiscoveryComponentsDto } from 'types/discovery/discovery';

// Keys for the Discovery API
export const discoveryKeys = {
  all: ['discovery'] as const,
  components: () => [...discoveryKeys.all, 'components'] as const,
  componentsList: (params?: GetDiscoveryComponentsDto) => [...discoveryKeys.components(), params] as const,
  syncStatus: () => [...discoveryKeys.all, 'syncStatus'] as const
};

// Hook for fetching nested component trees
export function useDiscoveryComponents(params?: GetDiscoveryComponentsDto) {
  return useQuery({
    queryKey: discoveryKeys.componentsList(params),
    queryFn: () => getDiscoveryComponents(params),
    enabled: !!params?.profileId
    // By relying on the built-in React Query error handling and staleTime, we avoid rapid re-fetches
    // You can customize staleTime here depending on how frequently components change.
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
      // Invalidate the discovery trees so it refetches immediately
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    }
  });
}
