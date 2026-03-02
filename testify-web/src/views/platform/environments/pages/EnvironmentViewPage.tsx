import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import EnvironmentForm from '../EnvironmentForm';
import { usePlatformEnvironment, useDeletePlatformEnvironment, useTestPlatformEnvironmentConnection } from 'hooks/platform/useEnvironments';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useTheme, Tooltip, IconButton, Stack, CircularProgress } from '@mui/material';
import { IconEdit, IconTrash, IconPlugConnected } from '@tabler/icons-react';
import { usePermission } from 'contexts/AuthContext';
import { useSnackbar } from 'contexts/SnackbarContext';
import { PERMISSIONS } from 'constants/permissions';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const EnvironmentViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { showMessage } = useSnackbar();

  const { goBack, getLinkTo } = useContextualNavigation('/platform/environments');
  const { can } = usePermission();

  // Data Hooks
  const { data: environment, isLoading, error } = usePlatformEnvironment(id!);
  const { mutateAsync: deleteEnvironment } = useDeletePlatformEnvironment();
  const { mutateAsync: testConnection, isPending: isTesting } = useTestPlatformEnvironmentConnection();

  // Local State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEdit = () => {
    if (!id) return;
    navigate(getLinkTo('edit', { strategy: 'stack' }));
  };

  const handleTestConnection = async () => {
    if (!id) return;
    try {
      const response = await testConnection(id);
      if (response.success) {
        showMessage('Connection successful!', 'success');
      } else {
        showMessage(response.message || 'Connection failed.', 'error');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to test connection. See console for details.';
      showMessage(`Connection Failed: ${errorMsg}`, 'error');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteEnvironment(id);
      setDeleteDialogOpen(false);
      goBack();
    } catch (error) {
      console.error('Failed to delete environment', error);
    }
  };

  if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
  if (!environment) return <MainCard title="Error">Environment not found</MainCard>;
  if (error) return <MainCard title="Error">Error loading environment</MainCard>;

  return (
    <MainCard
      title={`${environment.name}`}
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {can(PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW) && (
            <Tooltip title="Test Connection">
              <span>
                <IconButton onClick={handleTestConnection} size="large" sx={{ color: theme.palette.info.main }} disabled={isTesting}>
                  {isTesting ? <CircularProgress size={20} /> : <IconPlugConnected stroke={1.5} size="1.3rem" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {can(PERMISSIONS.PLATFORM_ENVIRONMENT_EDIT) && ( // Assuming permission constant
            <Tooltip title="Edit Environment">
              <IconButton onClick={handleEdit} size="large" sx={{ color: theme.palette.primary.main }}>
                <IconEdit stroke={1.5} size="1.3rem" />
              </IconButton>
            </Tooltip>
          )}
          {can(PERMISSIONS.PLATFORM_ENVIRONMENT_DELETE) && (
            <Tooltip title="Delete Environment">
              <IconButton onClick={() => setDeleteDialogOpen(true)} size="large" sx={{ color: theme.palette.error.main }}>
                <IconTrash stroke={1.5} size="1.3rem" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      }
    >
      <EnvironmentForm
        mode="view"
        environment={environment}
        initialValues={environment as any} // Assuming form handles partial data mapping
        onSubmit={() => {}} // No-op
        isLoading={isLoading}
        onCancel={() => goBack()}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Environment"
        content={`Are you sure you want to delete environment "${environment.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </MainCard>
  );
};

export default EnvironmentViewPage;
