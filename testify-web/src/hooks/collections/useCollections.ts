import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCollections, getCollection, createCollection, executeCollection, deleteCollection } from 'api/collections/collections';
import { useSnackbar } from 'contexts/SnackbarContext';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

export const COLLECTIONS_KEYS = {
  all: ['collections'] as const,
  details: () => [...COLLECTIONS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...COLLECTIONS_KEYS.details(), id] as const,
  mutations: {
    create: ['collections', 'create'] as const,
    execute: ['collections', 'execute'] as const,
    delete: ['collections', 'delete'] as const
  }
};

export const useGetCollections = () => {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.COLLECTION_VIEW);

  return useQuery({
    queryKey: COLLECTIONS_KEYS.all,
    queryFn: getCollections,
    enabled: isEnabled,
    initialData: []
  });
};

export const useGetCollection = (id: string, options?: { enabled?: boolean }) => {
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && !!id && can(PERMISSIONS.COLLECTION_VIEW);

  return useQuery({
    queryKey: COLLECTIONS_KEYS.detail(id),
    queryFn: () => getCollection(id),
    enabled: isEnabled,
    staleTime: 0 // Fetch fresh data for collections details usually
  });
};

export const useCreateCollection = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: COLLECTIONS_KEYS.mutations.create,
    mutationFn: createCollection,
    onSuccess: () => {
      showMessage('Collection created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_KEYS.all });
    },
    onError: (error: any) => {
      showMessage(error.response?.data?.message || error.message || 'Failed to create collection', 'error');
    }
  });
};

export const useExecuteCollection = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: COLLECTIONS_KEYS.mutations.execute,
    mutationFn: ({ id, testIds }: { id: string; testIds?: string[] }) => executeCollection(id, testIds),
    onSuccess: (_, variables) => {
      showMessage('Collection execution started', 'success');
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      showMessage(error.response?.data?.message || error.message || 'Failed to execute collection', 'error');
    }
  });
};

export const useDeleteCollection = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: COLLECTIONS_KEYS.mutations.delete,
    mutationFn: deleteCollection,
    onSuccess: () => {
      showMessage('Collection deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_KEYS.all });
    },
    onError: (error: any) => {
      showMessage(error.response?.data?.message || error.message || 'Failed to delete collection', 'error');
    }
  });
};
