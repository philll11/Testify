import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPlatformProfiles,
    getPlatformProfile,
    createPlatformProfile,
    updatePlatformProfile,
    deletePlatformProfile
} from 'api/platform/profiles';
import { CreatePlatformProfileDto, UpdatePlatformProfileDto } from 'types/platform/profiles';

export const platformProfileKeys = {
    all: ['platform-profiles'] as const,
    details: () => [...platformProfileKeys.all, 'detail'] as const,
    detail: (id: string) => [...platformProfileKeys.details(), id] as const,
};

export function usePlatformProfiles() {
    return useQuery({
        queryKey: platformProfileKeys.all,
        queryFn: getPlatformProfiles,
    });
}

export function usePlatformProfile(id: string) {
    return useQuery({
        queryKey: platformProfileKeys.detail(id),
        queryFn: () => getPlatformProfile(id),
        enabled: !!id,
    });
}

export function useCreatePlatformProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePlatformProfileDto) => createPlatformProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: platformProfileKeys.all });
        },
    });
}

export function useUpdatePlatformProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePlatformProfileDto }) => updatePlatformProfile({ id, data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: platformProfileKeys.all });
        },
    });
}

export function useDeletePlatformProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deletePlatformProfile(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: platformProfileKeys.all });
        },
    });
}
