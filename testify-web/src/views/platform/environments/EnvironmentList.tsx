import { useState, useCallback, useMemo, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, Avatar, Drawer, Tooltip, IconButton, Divider, Stack, Button, CircularProgress } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconExternalLink, IconPencil, IconPlugConnected } from '@tabler/icons-react';
import { format } from 'date-fns';

// Project Imports
import {
  usePlatformEnvironments,
  useDeletePlatformEnvironment,
  useCreatePlatformEnvironment,
  useUpdatePlatformEnvironment,
  useTestPlatformEnvironmentConnection
} from 'hooks/platform/useEnvironments';
import { usePlatformProfiles } from 'hooks/platform/useProfiles';
import { PlatformEnvironment } from 'types/platform/environments';
import { PlatformEnvironmentFormData } from 'types/platform/environments.schema';
import EnvironmentForm, { EnvironmentFormMode } from './EnvironmentForm';

import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import SplitActionButton from 'ui-component/extended/SplitActionButton';
import { PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';
import { useSnackbar } from 'contexts/SnackbarContext';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import MainCard from 'ui-component/cards/MainCard';

const EnvironmentList = () => {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation('/platform/environments');
  const { can } = usePermission();
  const { showMessage } = useSnackbar();

  // Queries & Mutations
  const { data: environments = [], isLoading } = usePlatformEnvironments();
  const { data: profiles = [] } = usePlatformProfiles();
  const { mutateAsync: deleteEnvironment } = useDeletePlatformEnvironment();
  const { mutateAsync: createEnvironment, isPending: isCreating } = useCreatePlatformEnvironment();
  const { mutateAsync: updateEnvironment, isPending: isUpdating } = useUpdatePlatformEnvironment();
  const { mutateAsync: testConnection, isPending: isTesting } = useTestPlatformEnvironmentConnection();

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<EnvironmentFormMode>('create');
  const [selectedEnvironment, setSelectedEnvironment] = useState<PlatformEnvironment | null>(null);
  const [createDraft, setCreateDraft] = useState<Partial<PlatformEnvironmentFormData>>({});

  // Dirty State for drawer
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Discard Dialog
  const { discardDialogProps, trigger } = useDiscardWarning(
    drawerOpen && isFormDirty && mode === 'edit',
    'You have unsaved changes. Are you sure you want to discard them?'
  );

  const handleOpenDrawer = (newMode: EnvironmentFormMode, env: PlatformEnvironment | null = null) => {
    setMode(newMode);
    setSelectedEnvironment(env);
    setIsFormDirty(false);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = (event?: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
    const performClose = () => {
      setDrawerOpen(false);
      setIsFormDirty(false);
      setSelectedEnvironment(null);
    };

    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      if (mode === 'edit' && isFormDirty) {
        trigger(performClose);
        return;
      }
    } else {
      if (isFormDirty) {
        trigger(performClose);
        return;
      }
    }
    performClose();
  };

  const handleCancelForm = () => {
    const performCancel = () => {
      if (isCreating) setCreateDraft({});
      setDrawerOpen(false);
      setIsFormDirty(false);
      setSelectedEnvironment(null);
    };

    if (isCreating) {
      if (Object.keys(createDraft).length > 0 || isFormDirty) {
        trigger(performCancel, 'Discard new environment draft? This cannot be undone.');
        return;
      }
    } else if (mode === 'edit') {
      if (isFormDirty) {
        trigger(performCancel);
        return;
      }
    }

    performCancel();
  };

  const handleTestConnection = async (envId: string) => {
    try {
      const response = await testConnection(envId);
      if (response.success) {
        showMessage('Connection successful!', 'success');
      } else {
        showMessage(response.message || 'Connection failed.', 'error');
      }
    } catch (err) {
      showMessage('Failed to test connection. See console for details.', 'error');
      console.error(err);
    }
  };

  const handleFormValuesChange = useCallback(
    (values: Partial<PlatformEnvironmentFormData>) => {
      if (mode === 'create') {
        setCreateDraft((prev) => ({ ...prev, ...values }));
      }
    },
    [mode]
  );

  const handleFormSubmit = async (values: PlatformEnvironmentFormData) => {
    try {
      if (mode === 'create') {
        await createEnvironment(values);
      } else if (mode === 'edit' && selectedEnvironment) {
        await updateEnvironment({ id: selectedEnvironment.id, data: values });
      }
      setDrawerOpen(false);
      setCreateDraft({});
      setIsFormDirty(false);
    } catch (error) {
      // Error handled by query client / toast
      console.error(error);
    }
  };

  // --- Actions ---
  const handleCreatePage = () => navigate(getLinkTo('/platform/environments/create'));
  const handleViewPage = (id: string, e?: MouseEvent) => {
    e?.stopPropagation(); // Prevent row click
    navigate(getLinkTo(`/platform/environments/${id}`));
  };
  const handleEditPage = (id: string, e?: MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/platform/environments/${id}/edit`));
  };

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [envToDelete, setEnvToDelete] = useState<PlatformEnvironment | null>(null);

  const handleDeleteClick = (env: PlatformEnvironment, e: MouseEvent) => {
    e.stopPropagation();
    setEnvToDelete(env);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (envToDelete) {
      await deleteEnvironment(envToDelete.id);
      setDeleteDialogOpen(false);
      setEnvToDelete(null);
    }
  };

  // --- Column Configuration ---
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Environment Name',
        flex: 1,
        minWidth: 150
      },
      {
        field: 'profile',
        headerName: 'Profile',
        flex: 1,
        minWidth: 150,
        valueGetter: (value, row) => row?.profile?.name || profiles.find((p) => p.id === row.profileId)?.name || '',
        renderCell: (params: GridRenderCellParams) => {
          const profile = params.row.profile || profiles.find((p) => p.id === params.row.profileId);
          return profile ? (
            <Chip label={profile.name} size="small" />
          ) : (
            <Typography variant="caption" color="textSecondary">
              No Profile
            </Typography>
          );
        }
      },
      {
        field: 'platformType',
        headerName: 'Platform Type',
        flex: 1,
        minWidth: 120,
        valueGetter: (value, row) => row.platformType || '',
        renderCell: (params: GridRenderCellParams) => {
          const type = params.row.platformType;
          return type ? <Chip label={type.toUpperCase()} size="small" variant="outlined" /> : '-';
        }
      },
      {
        field: 'isDefault',
        headerName: 'Flags',
        flex: 0.5,
        minWidth: 100,
        renderCell: (params: GridRenderCellParams) => {
          const isDefault = params.value as boolean;
          return isDefault ? <Chip label="Default" size="small" color="success" variant="outlined" /> : null;
        }
      },
      {
        field: 'actions',
        headerName: 'Actions',
        flex: 1,
        minWidth: 120,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params: GridRenderCellParams) => {
          const env = params.row as PlatformEnvironment;
          return (
            <>
              {can(PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW) && (
                <Tooltip title="View Details">
                  <IconButton color="primary" size="small" onClick={(e) => handleViewPage(env.id, e)}>
                    <IconEye size={18} />
                  </IconButton>
                </Tooltip>
              )}
              {can(PERMISSIONS.PLATFORM_ENVIRONMENT_EDIT) && (
                <>
                  <Tooltip title="Edit">
                    <IconButton color="secondary" size="small" onClick={(e) => handleEditPage(env.id, e)}>
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Quick Edit">
                    <IconButton
                      color="warning"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDrawer('edit', env);
                      }}
                    >
                      <IconPencil size={18} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {can(PERMISSIONS.PLATFORM_ENVIRONMENT_DELETE) && (
                <Tooltip title="Delete">
                  <IconButton color="error" size="small" onClick={(e) => handleDeleteClick(env, e)}>
                    <IconTrash size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          );
        }
      }
    ],
    [can, profiles]
  );

  return (
    <MainCard
      title="Platform Environments"
      secondary={
        can(PERMISSIONS.PLATFORM_ENVIRONMENT_CREATE) && (
          <SplitActionButton
            primaryLabel="Create Environment"
            primaryStartIcon={<IconPlus size={18} />}
            primaryAction={() => handleOpenDrawer('create')}
            options={[
              {
                label: 'Create in New Page',
                icon: <IconExternalLink size={18} />,
                onClick: handleCreatePage
              }
            ]}
          />
        )
      }
    >
      <DataGridWrapper
        rows={environments}
        columns={columns}
        loading={isLoading}
        onRowClick={(params) => handleOpenDrawer('view', params.row as PlatformEnvironment)}
        getRowId={(row) => row.id}
      />
      {/* Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 500, md: 600 } } } }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">
              {mode === 'create' ? 'New Environment' : mode === 'edit' ? 'Edit Environment' : selectedEnvironment?.name}
            </Typography>
            {mode === 'view' && selectedEnvironment && (
              <Stack direction="row" spacing={1}>                  {can(PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW) && (
                <Tooltip title="Test Connection">
                  <span>
                    <IconButton size="small" onClick={() => handleTestConnection(selectedEnvironment.id)} color="info" disabled={isTesting}>
                      {isTesting ? <CircularProgress size={18} /> : <IconPlugConnected size={18} />}
                    </IconButton>
                  </span>
                </Tooltip>
              )}                {can(PERMISSIONS.PLATFORM_ENVIRONMENT_EDIT) && (
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                    <IconEdit size={18} />
                  </IconButton>
                </Tooltip>
              )}
                {can(PERMISSIONS.PLATFORM_ENVIRONMENT_DELETE) && (
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={(e) => handleDeleteClick(selectedEnvironment, e)} color="error">
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          <EnvironmentForm
            mode={mode}
            environment={selectedEnvironment}
            initialValues={mode === 'create' ? createDraft : undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            isLoading={isCreating || isUpdating}
            onDirtyChange={setIsFormDirty}
            onValuesChange={handleFormValuesChange}
          />
        </Box>
      </Drawer>

      {/* Discard Warning Dialog */}
      <ConfirmDialog {...discardDialogProps} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Environment"
        content={`Are you sure you want to delete ${envToDelete?.name}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="error"
      />
    </MainCard>
  );
};

export default EnvironmentList;
