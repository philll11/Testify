import { useState, useCallback, useMemo, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Drawer, Tooltip, IconButton, Divider, Stack } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconExternalLink, IconUpload, IconPencil } from '@tabler/icons-react';

// Project Imports
import {
    useGetTestRegistries,
    useDeleteTestRegistry,
    useCreateTestRegistry,
    useUpdateTestRegistry
} from 'hooks/test-registry/useTestRegistry';
import { TestRegistry } from 'types/test-registry/test-registry.types';
import { TestRegistryFormData } from 'types/test-registry/test-registry.schema';
import TestRegistryForm, { TestRegistryFormMode } from './components/TestRegistryForm';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import SplitActionButton from 'ui-component/extended/SplitActionButton';
import { PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import MainCard from 'ui-component/cards/MainCard';
import { CsvImportDialog } from './components/CsvImportDialog';
import { useEnvironmentContext } from 'contexts/EnvironmentContext';
import { usePlatformEnvironments } from 'hooks/platform/useEnvironments';
import { useSnackbar } from 'contexts/SnackbarContext';

const TestRegistryList = () => {
    const navigate = useNavigate();
    const { getLinkTo } = useContextualNavigation('/test-registry');
    const { can } = usePermission();
    const { showMessage } = useSnackbar();

    const { activeEnvironmentId, triggerEnvironmentWarning } = useEnvironmentContext();
    const { data: environments } = usePlatformEnvironments();
    const activeEnv = environments?.find(e => e.id === activeEnvironmentId);
    const profileId = activeEnv?.profileId;

    // Queries & Mutations
    const { data: testRegistries = [], isLoading } = useGetTestRegistries(profileId);
    const { mutateAsync: deleteMapping } = useDeleteTestRegistry();
    const { mutateAsync: createMapping, isPending: isCreating } = useCreateTestRegistry();
    const { mutateAsync: updateMapping, isPending: isUpdating } = useUpdateTestRegistry();

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<TestRegistryFormMode>('create');
    const [selectedMapping, setSelectedMapping] = useState<TestRegistry | null>(null);
    const [createDraft, setCreateDraft] = useState<Partial<TestRegistryFormData>>({});

    // Import Dialog
    const [importOpen, setImportOpen] = useState(false);

    // Dirty State for drawer
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Discard Dialog
    const { discardDialogProps, trigger } = useDiscardWarning(
        drawerOpen && isFormDirty && mode === 'edit',
        'You have unsaved changes. Are you sure you want to discard them?'
    );

    const handleOpenDrawer = (newMode: TestRegistryFormMode, mapping: TestRegistry | null = null) => {
        setMode(newMode);
        setSelectedMapping(mapping);
        setIsFormDirty(false);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = (event?: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
        const performClose = () => {
            setDrawerOpen(false);
            setIsFormDirty(false);
            setSelectedMapping(null);
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
            setSelectedMapping(null);
        };

        if (isCreating) {
            if (Object.keys(createDraft).length > 0 || isFormDirty) {
                trigger(performCancel, 'Discard new mapping draft? This cannot be undone.');
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

    const handleFormValuesChange = useCallback(
        (values: Partial<TestRegistryFormData>) => {
            if (mode === 'create') {
                setCreateDraft((prev) => ({ ...prev, ...values }));
            }
        },
        [mode]
    );

    // Form Submit Handler
    const handleFormSubmit = async (values: any) => {
        try {
            if (mode === 'create') {
                if (!activeEnvironmentId || !profileId) {
                    triggerEnvironmentWarning();
                    showMessage('Please select an environment from the global dropdown before creating a mapping.', 'warning');
                    return;
                }
                await createMapping({ ...values, profileId, environmentId: activeEnvironmentId });
            } else if (mode === 'edit' && selectedMapping) {
                await updateMapping({ id: selectedMapping.id, data: values });
            }
            setDrawerOpen(false);
            setCreateDraft({});
            setIsFormDirty(false);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred';
            showMessage(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage, 'error');
            console.error(error);
        }
    };
    // --- Actions ---
    const handleCreatePage = () => navigate(getLinkTo('/test-registry/create'));
    const handleViewPage = (id: string, e?: MouseEvent) => {
        e?.stopPropagation();
        navigate(getLinkTo(`/test-registry/${id}`));
    };
    const handleEditPage = (id: string, e?: MouseEvent) => {
        e?.stopPropagation();
        navigate(getLinkTo(`/test-registry/${id}/edit`));
    };

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [mappingToDelete, setMappingToDelete] = useState<TestRegistry | null>(null);

    const handleDeleteClick = (mapping: TestRegistry, e: MouseEvent) => {
        e.stopPropagation();
        setMappingToDelete(mapping);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (mappingToDelete) {
            await deleteMapping(mappingToDelete.id);
            setDeleteDialogOpen(false);
            setMappingToDelete(null);
        }
    };

    // --- Column Configuration ---
    const columns: GridColDef[] = useMemo(
        () => [
            { field: 'targetComponentName', headerName: 'Target Name', flex: 1, minWidth: 200, valueGetter: (params, row) => row.targetComponentName || row.targetComponentId },
            { field: 'testComponentName', headerName: 'Test Name', flex: 1, minWidth: 200, valueGetter: (params, row) => row.testComponentName || row.testComponentId },
            {
                field: 'actions',
                headerName: 'Actions',
                flex: 1,
                minWidth: 180,
                sortable: false,
                filterable: false,
                align: 'right',
                headerAlign: 'right',
                renderCell: (params: GridRenderCellParams) => {
                    const mapping = params.row as TestRegistry;
                    return (
                        <>
                            {can(PERMISSIONS.USER_VIEW) && (
                                <Tooltip title="View Details">
                                    <IconButton color="primary" size="small" onClick={(e) => handleViewPage(mapping.id, e)}>
                                        <IconEye size={18} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {can(PERMISSIONS.USER_EDIT) && (
                                <>
                                    <Tooltip title="Edit">
                                        <IconButton color="secondary" size="small" onClick={(e) => handleEditPage(mapping.id, e)}>
                                            <IconEdit size={18} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Quick Edit">
                                        <IconButton
                                            color="warning"
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenDrawer('edit', mapping);
                                            }}
                                        >
                                            <IconPencil size={18} />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                            {can(PERMISSIONS.USER_DELETE) && (
                                <Tooltip title="Delete">
                                    <IconButton size="small" color="error" onClick={(e) => handleDeleteClick(mapping, e)}>
                                        <IconTrash size={18} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </>
                    );
                }
            }
        ],
        [can, handleViewPage, handleEditPage, handleDeleteClick]
    );

    return (
        <MainCard
            title="Test Registry"
            secondary={
                can(PERMISSIONS.ROLE_CREATE) && (
                    <SplitActionButton
                        primaryLabel="Create Mapping"
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
                rows={testRegistries}
                columns={columns}
                loading={isLoading}
                onRowClick={(params) => handleOpenDrawer('view', params.row as TestRegistry)}
                getRowId={(row) => row.id}
            />

            {/* Quick View / Create / Edit Drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={handleCloseDrawer}
                slotProps={{ paper: { sx: { width: { xs: '100%', sm: 500, md: 600 } } } }}
            >
                <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h4">{mode === 'create' ? 'New Mapping' : mode === 'edit' ? 'Edit Mapping' : 'Mapping Details'}</Typography>
                        {mode === 'view' && selectedMapping && (
                            <Stack direction="row" spacing={1}>
                                {can(PERMISSIONS.ROLE_EDIT) && (
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                                            <IconEdit size={18} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {can(PERMISSIONS.ROLE_DELETE) && (
                                    <Tooltip title="Delete">
                                        <IconButton size="small" onClick={(e) => handleDeleteClick(selectedMapping, e)} color="error">
                                            <IconTrash size={18} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        )}
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <TestRegistryForm
                        mode={mode}
                        testRegistry={selectedMapping}
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
                title="Delete Test Mapping"
                content="Are you sure you want to delete this mapping? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmColor="error"
            />

            {/* Import Dialog */}
            <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
        </MainCard >
    );
};

export default TestRegistryList;