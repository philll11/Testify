import { useState, useCallback, useMemo, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Chip,
    Avatar,
    Drawer,
    Tooltip,
    IconButton,
    Divider,
    Stack
} from '@mui/material';
import { startCase, toLower } from 'lodash-es';
import {
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconExternalLink, IconPencil } from '@tabler/icons-react';

// Project Imports
import { usePlatformProfiles, useCreatePlatformProfile, useUpdatePlatformProfile, useDeletePlatformProfile } from 'hooks/platform/useProfiles';
import { PlatformProfile } from 'types/platform/profiles';
import { PlatformProfileFormData } from 'types/platform/profiles.schema';
import ProfileForm, { ProfileFormMode } from './ProfileForm';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import SplitActionButton from 'ui-component/extended/SplitActionButton';
import { PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import MainCard from 'ui-component/cards/MainCard';

// Helper for Status Chip
const getStatusChip = (isActive?: boolean) => {
    return isActive ? (
        <Chip label="Default Profile" color="success" size="small" variant="outlined" />
    ) : null;
};

const profileName = (profile?: PlatformProfile | null) => {
    if (!profile) return 'Profile Details';
    return profile.name;
};

const ProfileList = () => {
    const navigate = useNavigate();
    const { getLinkTo } = useContextualNavigation('/platform/profiles');
    const { can } = usePermission();

    // Queries & Mutations
    const { data: profiles = [], isLoading } = usePlatformProfiles();
    const { mutateAsync: deleteProfile } = useDeletePlatformProfile();
    const { mutateAsync: createProfile, isPending: isCreating } = useCreatePlatformProfile();
    const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdatePlatformProfile();

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<ProfileFormMode>('create');
    const [selectedProfile, setSelectedProfile] = useState<PlatformProfile | null>(null);
    const [createDraft, setCreateDraft] = useState<Partial<PlatformProfileFormData>>({});

    // Dirty State for drawer
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Discard Dialog
    const { discardDialogProps, trigger } = useDiscardWarning(
        (drawerOpen && isFormDirty && mode === 'edit'),
        'You have unsaved changes. Are you sure you want to discard them?'
    );

    const handleOpenDrawer = (newMode: ProfileFormMode, profile: PlatformProfile | null = null) => {
        setMode(newMode);
        setSelectedProfile(profile);
        setIsFormDirty(false);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = (event?: {}, reason?: "backdropClick" | "escapeKeyDown") => {
        const performClose = () => {
            setDrawerOpen(false);
            setIsFormDirty(false);
            setSelectedProfile(null);
        };

        // If Closing via Backdrop/Escape (Persistence Check)
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            if (mode === 'edit' && isFormDirty) {
                trigger(performClose);
                return;
            }
            // Create mode stashes automatically
        }
        // If called manually (fallback)
        else {
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
            setSelectedProfile(null);
        };

        // Explicit Cancel Button Click
        if (isCreating) {
            // For create, Cancel means discard draft
            if (Object.keys(createDraft).length > 0 || isFormDirty) {
                trigger(performCancel, 'Discard new profile draft? This cannot be undone.');
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

    const handleFormValuesChange = useCallback((values: Partial<PlatformProfileFormData>) => {
        if (mode === 'create') {
            setCreateDraft(prev => ({ ...prev, ...values }));
        }
    }, [mode]);

    // Form Submit Handler
    const handleFormSubmit = async (values: any) => {
        try {
            if (mode === 'create') {
                await createProfile(values);
            } else if (mode === 'edit' && selectedProfile) {
                await updateProfile({ id: selectedProfile.id, data: values });
            }
            setDrawerOpen(false);
            setCreateDraft({});
            setIsFormDirty(false);
        } catch (error) {
            // Error is handled by hook notifications
        }
    };

    // --- Actions ---
    const handleCreatePage = () => navigate(getLinkTo('/platform/profiles/create'));
    const handleViewPage = (id: string, e?: MouseEvent) => {
        e?.stopPropagation(); // Prevent row click
        navigate(getLinkTo(`/platform/profiles/${id}`));
    };
    const handleEditPage = (id: string, e?: MouseEvent) => {
        e?.stopPropagation();
        navigate(getLinkTo(`/platform/profiles/${id}/edit`));
    };


    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<PlatformProfile | null>(null);

    const handleDeleteClick = (profile: PlatformProfile, e: MouseEvent) => {
        e.stopPropagation();
        setProfileToDelete(profile);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (profileToDelete) {
            await deleteProfile(profileToDelete.id);
            setDeleteDialogOpen(false);
            setProfileToDelete(null);
        }
    };
    // --- Column Configuration ---
    const columns: GridColDef[] = useMemo(() => [
        {
            field: 'name',
            headerName: 'Profile Name',
            flex: 1,
            minWidth: 200,
        },
        {
            field: 'platformType',
            headerName: 'Platform',
            flex: 1,
            minWidth: 150,
            valueGetter: (params: any, row: PlatformProfile) => startCase(toLower(row.platformType))
        },
        {
            field: 'config.pollInterval',
            headerName: 'Poll Interval',
            flex: 1,
            minWidth: 150,
            valueGetter: (params: any, row: PlatformProfile) => `${row.config.pollInterval} ms`
        },
        {
            field: 'isDefault',
            headerName: 'Flags',
            flex: 0.5,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams) => getStatusChip(params.value as boolean)
        },
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
                const profile = params.row as PlatformProfile;
                return (
                    <>
                        {can(PERMISSIONS.PLATFORM_PROFILE_VIEW) && (
                            <Tooltip title="View Details">
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={(e) => handleViewPage(profile.id, e)}
                                >
                                    <IconEye size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {can(PERMISSIONS.PLATFORM_PROFILE_EDIT) && (
                            <>
                                <Tooltip title="Edit">
                                    <IconButton
                                        color="secondary"
                                        size="small"
                                        onClick={(e) => handleEditPage(profile.id, e)}
                                    >
                                        <IconEdit size={18} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Quick Edit">
                                    <IconButton
                                        color="warning"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDrawer('edit', profile);
                                        }}
                                    >
                                        <IconPencil size={18} />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        {can(PERMISSIONS.PLATFORM_PROFILE_DELETE) && (
                            <Tooltip title="Delete">
                                <IconButton
                                    color="error"
                                    size="small"
                                    onClick={(e) => handleDeleteClick(profile, e)}
                                >
                                    <IconTrash size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                );
            }
        }
    ], [can, handleViewPage, handleEditPage, handleDeleteClick]);

    return (
        <MainCard
            title="Platform Profiles"
            secondary={
                can(PERMISSIONS.PLATFORM_PROFILE_CREATE) && (
                    <SplitActionButton
                        primaryLabel="Create Profile"
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
                rows={profiles}
                columns={columns}
                loading={isLoading}
                onRowClick={(params) => handleOpenDrawer('view', params.row as PlatformProfile)}
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
                        <Typography variant="h4">
                            {mode === 'create' ? 'New Profile' : mode === 'edit' ? 'Edit Profile' : profileName(selectedProfile)}
                        </Typography>
                        {mode === 'view' && selectedProfile && (
                            <Stack direction="row" spacing={1}>
                                {can(PERMISSIONS.PLATFORM_PROFILE_EDIT) && (
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                                            <IconEdit size={18} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {can(PERMISSIONS.PLATFORM_PROFILE_DELETE) && (
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleDeleteClick(selectedProfile, e)}
                                            color="error"
                                        >
                                            <IconTrash size={18} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        )}
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <ProfileForm
                        mode={mode}
                        profile={selectedProfile}
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
                title="Delete Profile"
                content={`Are you sure you want to delete ${profileName(selectedProfile)}? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmColor="error"
            />

        </MainCard>
    );
};


export default ProfileList;
