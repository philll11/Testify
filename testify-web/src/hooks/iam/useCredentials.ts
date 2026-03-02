import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCredentials, createCredential, deleteCredential } from 'api/iam/credentials';
import { useSnackbar } from 'contexts/SnackbarContext';
import { CreateCredentialPayload, Credential } from 'types/iam/credential.types';

export const CREDENTIALS_KEYS = {
  all: ['credentials'] as const,
  lists: () => [...CREDENTIALS_KEYS.all, 'list'] as const
};

export const useGetCredentials = () => {
  return useQuery({
    queryKey: CREDENTIALS_KEYS.lists(),
    queryFn: getCredentials
  });
};

export const useCreateCredential = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationFn: createCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_KEYS.lists() });
      showMessage('Credential created successfully', 'success');
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to create credential', 'error');
    }
  });
};

export const useDeleteCredential = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationFn: deleteCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_KEYS.lists() });
      showMessage('Credential deleted successfully', 'success');
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to delete credential', 'error');
    }
  });
};
