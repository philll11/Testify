import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTestRegistries,
    getTestRegistry,
    getTestRegistriesByTarget,
    createTestRegistry,
    updateTestRegistry,
    deleteTestRegistry,
    importTestRegistry
} from 'api/test-registry/test-registry';
import { useSnackbar } from 'contexts/SnackbarContext';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

export const TEST_REGISTRY_KEYS = {
    all: ['test-registry'] as const,
    lists: () => [...TEST_REGISTRY_KEYS.all, 'list'] as const,
    details: () => [...TEST_REGISTRY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...TEST_REGISTRY_KEYS.details(), id] as const,
    byTarget: (targetId: string) => [...TEST_REGISTRY_KEYS.all, 'target', targetId] as const,
    mutations: {
        create: ['test-registry', 'create'] as const,
        update: ['test-registry', 'update'] as const,
        delete: ['test-registry', 'delete'] as const,
        import: ['test-registry', 'import'] as const
    }
};

export const useGetTestRegistries = (profileId?: string, options?: { enabled?: boolean }) => {
    const { can } = usePermission();
    const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.TEST_REGISTRY_VIEW);

    return useQuery({
        queryKey: [...TEST_REGISTRY_KEYS.lists(), profileId],
        queryFn: () => getTestRegistries(profileId),
        enabled: isEnabled
    });
};

export const useGetTestRegistry = (id: string, options?: { enabled?: boolean }) => {
    const { can } = usePermission();
    const isEnabled = (options?.enabled ?? true) && !!id && can(PERMISSIONS.TEST_REGISTRY_VIEW);

    return useQuery({
        queryKey: TEST_REGISTRY_KEYS.detail(id),
        queryFn: () => getTestRegistry(id),
        enabled: isEnabled
    });
};

export const useGetTestRegistriesByTarget = (targetId: string, options?: { enabled?: boolean }) => {
    const { can } = usePermission();
    const isEnabled = (options?.enabled ?? true) && !!targetId && can(PERMISSIONS.TEST_REGISTRY_VIEW);

    return useQuery({
        queryKey: TEST_REGISTRY_KEYS.byTarget(targetId),
        queryFn: () => getTestRegistriesByTarget(targetId),
        enabled: isEnabled
    });
};

export const useCreateTestRegistry = () => {
    const queryClient = useQueryClient();
    const { showMessage } = useSnackbar();

    return useMutation({
        mutationKey: TEST_REGISTRY_KEYS.mutations.create,
        mutationFn: createTestRegistry,
        onSuccess: () => {
            showMessage('Test registry mapping created successfully', 'success');
            queryClient.invalidateQueries({ queryKey: TEST_REGISTRY_KEYS.all });
        },
        onError: (error: any) => {
            showMessage(error.response?.data?.message || error.message || 'Failed to create test registry mapping', 'error');
        }
    });
};

export const useUpdateTestRegistry = () => {
    const queryClient = useQueryClient();
    const { showMessage } = useSnackbar();

    return useMutation({
        mutationKey: TEST_REGISTRY_KEYS.mutations.update,
        mutationFn: ({ id, data }: { id: string; data: any }) => updateTestRegistry(id, data),
        onSuccess: (_, variables) => {
            showMessage('Test registry mapping updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: TEST_REGISTRY_KEYS.all });
            queryClient.invalidateQueries({ queryKey: TEST_REGISTRY_KEYS.detail(variables.id) });
        },
        onError: (error: any) => {
            showMessage(error.response?.data?.message || error.message || 'Failed to update test registry mapping', 'error');
        }
    });
};

export const useDeleteTestRegistry = () => {
    const queryClient = useQueryClient();
    const { showMessage } = useSnackbar();

    return useMutation({
        mutationKey: TEST_REGISTRY_KEYS.mutations.delete,
        mutationFn: deleteTestRegistry,
        onSuccess: () => {
            showMessage('Test registry mapping deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: TEST_REGISTRY_KEYS.all });
        },
        onError: (error: any) => {
            showMessage(error.response?.data?.message || error.message || 'Failed to delete mapping', 'error');
        }
    });
};

export const useImportTestRegistry = () => {
    const queryClient = useQueryClient();
    const { showMessage } = useSnackbar();

    return useMutation({
        mutationKey: TEST_REGISTRY_KEYS.mutations.import,
        mutationFn: importTestRegistry,
        onSuccess: () => {
            showMessage('Mappings imported successfully', 'success');
            queryClient.invalidateQueries({ queryKey: TEST_REGISTRY_KEYS.all });
        },
        onError: (error: any) => {
            showMessage(error.response?.data?.message || error.message || 'Failed to import mappings', 'error');
        }
    });
};

