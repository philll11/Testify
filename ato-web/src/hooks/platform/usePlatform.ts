import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlatformProfiles,
  getPlatformProfile,
  createPlatformProfile,
  updatePlatformProfile,
  deletePlatformProfile
} from 'api/platform/profiles';
import {
  getPlatformEnvironments,
  createPlatformEnvironment,
  getPlatformEnvironment,
  updatePlatformEnvironment,
  deletePlatformEnvironment
} from 'api/platform/environments';
import {
  CreatePlatformEnvironmentDto,
  CreatePlatformProfileDto,
  UpdatePlatformEnvironmentDto,
  UpdatePlatformProfileDto
} from 'types/platform';

// Profile Keys
export const platformProfileKeys = {
  all: ['platform-profiles'] as const,
  details: () => [...platformProfileKeys.all, 'detail'] as const,
  detail: (id: string) => [...platformProfileKeys.details(), id] as const
};

// Environment Keys
export const platformEnvironmentKeys = {
  all: ['platform-environments'] as const,
  details: () => [...platformEnvironmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...platformEnvironmentKeys.details(), id] as const
};

// Profile Hooks
export function usePlatformProfiles() {
  return useQuery({
    queryKey: platformProfileKeys.all,
    queryFn: getPlatformProfiles
  });
}

export function usePlatformProfile(id: string) {
  return useQuery({
    queryKey: platformProfileKeys.detail(id),
    queryFn: () => getPlatformProfile(id),
    enabled: !!id
  });
}

export function useCreatePlatformProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlatformProfileDto) => createPlatformProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformProfileKeys.all });
    }
  });
}

export function useUpdatePlatformProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlatformProfileDto }) => updatePlatformProfile({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformProfileKeys.all });
    }
  });
}

export function useDeletePlatformProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlatformProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformProfileKeys.all });
    }
  });
}

// Environment Hooks
export function usePlatformEnvironments() {
  return useQuery({
    queryKey: platformEnvironmentKeys.all,
    queryFn: getPlatformEnvironments
  });
}

export function usePlatformEnvironment(id: string) {
  return useQuery({
    queryKey: platformEnvironmentKeys.detail(id),
    queryFn: () => getPlatformEnvironment(id),
    enabled: !!id
  });
}

export function useCreatePlatformEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlatformEnvironmentDto) => createPlatformEnvironment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformEnvironmentKeys.all });
    }
  });
}

export function useUpdatePlatformEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlatformEnvironmentDto }) => updatePlatformEnvironment({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformEnvironmentKeys.all });
    }
  });
}

export function useDeletePlatformEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlatformEnvironment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformEnvironmentKeys.all });
    }
  });
}
