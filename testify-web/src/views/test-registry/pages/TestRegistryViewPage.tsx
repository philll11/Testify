import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import TestRegistryForm from '../components/TestRegistryForm';
import { useGetTestRegistry, useDeleteTestRegistry } from 'hooks/test-registry/useTestRegistry';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useTheme, Tooltip, IconButton, Stack } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const TestRegistryViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const { goBack, getLinkTo } = useContextualNavigation('/test-registry');
    const { can } = usePermission();

    const { data: mapping, isLoading, error } = useGetTestRegistry(id!);
    const { mutateAsync: deleteMapping } = useDeleteTestRegistry();

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleEdit = () => {
        if (!id) return;
        navigate(getLinkTo('edit', { strategy: 'stack' }));
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteMapping(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete test mapping', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!mapping) return <MainCard title="Error">Test mapping not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading test mapping</MainCard>;

    return (
        <MainCard
            title="Test Mapping Details"
            secondary={
                <Stack direction="row" spacing={1}>
                    {can(PERMISSIONS.TEST_REGISTRY_EDIT) && (
                        <Tooltip title="Edit">
                            <IconButton onClick={handleEdit} size="large" sx={{ color: theme.palette.primary.main }}>
                                <IconEdit stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {can(PERMISSIONS.TEST_REGISTRY_DELETE) && (
                        <Tooltip title="Delete">
                            <IconButton onClick={() => setDeleteDialogOpen(true)} size="large" sx={{ color: theme.palette.error.main }}>
                                <IconTrash stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            }
        >
            <TestRegistryForm
                mode="view"
                testRegistry={mapping}
                onSubmit={() => { }}
                isLoading={isLoading}
                onCancel={() => goBack()}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Mapping"
                content="Are you sure you want to delete this test mapping? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                confirmColor="error"
            />
        </MainCard>
    );
};

export default TestRegistryViewPage;
