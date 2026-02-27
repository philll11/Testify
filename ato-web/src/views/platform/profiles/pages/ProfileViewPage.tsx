import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import ProfileForm from '../ProfileForm';
import { usePlatformProfile, useDeletePlatformProfile } from 'hooks/platform/useProfiles';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useTheme, Tooltip, IconButton, Stack } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const ProfileViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const { goBack, getLinkTo } = useContextualNavigation('/platform/profiles');
    const { can } = usePermission();

    // Data Hooks
    const { data: profile, isLoading, error } = usePlatformProfile(id!);
    const { mutateAsync: deleteProfile } = useDeletePlatformProfile();

    // Local State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleEdit = () => {
        if (!id) return;
        navigate(getLinkTo('edit', { strategy: 'stack' }));
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteProfile(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete profile', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!profile) return <MainCard title="Error">Profile not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading profile</MainCard>;

    return (
        <MainCard
            title={`${profile.name}`}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {can(PERMISSIONS.PLATFORM_PROFILE_EDIT) && (
                        <Tooltip title="Edit Profile">
                            <IconButton
                                onClick={handleEdit}
                                size="large"
                                sx={{ color: theme.palette.primary.main }}
                            >
                                <IconEdit stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {can(PERMISSIONS.PLATFORM_PROFILE_DELETE) && (
                        <Tooltip title="Delete Profile">
                            <IconButton
                                onClick={() => setDeleteDialogOpen(true)}
                                size="large"
                                sx={{ color: theme.palette.error.main }}
                            >
                                <IconTrash stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            }
        >
            <ProfileForm
                mode="view"
                initialValues={profile}
                onSubmit={() => { }} // No-op
                isLoading={isLoading}
                onCancel={() => goBack()}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Profile"
                content={`Are you sure you want to delete profile "${profile.name}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                confirmColor="error"
            />
        </MainCard>
    );
};

export default ProfileViewPage;

