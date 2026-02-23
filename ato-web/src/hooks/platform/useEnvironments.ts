import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPlatformEnvironments,
    createPlatformEnvironment,
    getPlatformEnvironment,
    updatePlatformEnvironment,
    deletePlatformEnvironment,
} from 'api/platform/environments';
import { CreatePlatformEnvironmentDto, UpdatePlatformEnvironmentDto } from 'types/platform/environments';

export const platformEnvironmentKeys = {
    all: ['platform-environments'] as const,
    details: () => [...platformEnvironmentKeys.all, 'detail'] as const,
    detail: (id: string) => [...platformEnvironmentKeys.details(), id] as const,
};

export function usePlatformEnvironments() {
    return useQuery({
        queryKey: platformEnvironmentKeys.all,
        queryFn: getPlatformEnvironments,
    });
}

export function usePlatformEnvironment(id: string) {
    return useQuery({
        queryKey: platformEnvironmentKeys.detail(id),
        queryFn: () => getPlatformEnvironment(id),
        enabled: !!id,
    });
}

export function useCreatePlatformEnvironment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePlatformEnvironmentDto) => createPlatformEnvironment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: platformEnvironmentKeys.all });
        },
    });
}

export function useUpdatePlatformEnvironment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePlatformEnvironmentDto }) => updatePlatformEnvironment({ id, data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: platformEnvironmentKeys.all });
        },
    });
}

export function useDeletePlatformEnvironment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deletePlatformEnvironment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: platformEnvironmentKeys.all });
        },
    });
}
