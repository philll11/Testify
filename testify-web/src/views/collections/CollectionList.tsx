import { useMemo, useState, MouseEvent } from 'react';
import { Button, Tooltip, IconButton } from '@mui/material';
import { IconPlus, IconTrash, IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useGetCollections, useDeleteCollection } from 'hooks/collections/useCollections';
import { format } from 'date-fns';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { useContextualNavigation } from 'hooks/useContextualNavigation';

export const CollectionList = () => {
    const navigate = useNavigate();
    const { getLinkTo } = useContextualNavigation('/collections');
    const { can } = usePermission();

    // Queries & Mutations
    const { data: collections = [], isLoading } = useGetCollections();
    const { mutateAsync: deleteCollection } = useDeleteCollection();

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState<any | null>(null);

    // --- Actions ---
    const handleViewPage = (id: string, e?: MouseEvent) => {
        e?.stopPropagation();
        navigate(getLinkTo(`/collections/${id}`));
    };

    const handleDeleteClick = (collection: any, e: MouseEvent) => {
        e.stopPropagation();
        setCollectionToDelete(collection);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (collectionToDelete) {
            await deleteCollection(collectionToDelete.id);
            setDeleteDialogOpen(false);
            setCollectionToDelete(null);
        }
    };

    const columns: GridColDef[] = useMemo(
        () => [
            { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
            { field: 'description', headerName: 'Description', flex: 1.5 },
            { field: 'collectionType', headerName: 'Type', flex: 0.5, minWidth: 150 },
            {
                field: 'createdAt',
                headerName: 'Created At',
                flex: 0.5,
                minWidth: 200,
                valueFormatter: (value: any) => (value ? format(new Date(value as string), 'MMM d, yyyy HH:mm') : '-')
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
                    const collection = params.row;
                    return (
                        <>
                            {can(PERMISSIONS.COLLECTION_VIEW) && (
                                <Tooltip title="View Details">
                                    <IconButton color="primary" size="small" onClick={(e) => handleViewPage(collection.id, e)}>
                                        <IconEye size={18} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {can(PERMISSIONS.COLLECTION_DELETE) && (
                                <Tooltip title="Delete">
                                    <IconButton size="small" color="error" onClick={(e) => handleDeleteClick(collection, e)}>
                                        <IconTrash size={18} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </>
                    );
                }
            }
        ],
        [can, handleViewPage, handleDeleteClick]
    );

    return (
        <MainCard
            title="Collections"
            secondary={
                can(PERMISSIONS.COLLECTION_CREATE) && (
                    <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate(getLinkTo('/discovery/collection-builder'))}>
                        Build Collection
                    </Button>
                )
            }
        >
            <DataGridWrapper
                rows={collections}
                columns={columns}
                loading={isLoading}
                onRowClick={(params) => handleViewPage(params.row.id)}
                getRowId={(row: any) => row.id}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Collection"
                content="Are you sure you want to delete this collection? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setDeleteDialogOpen(false);
                    setCollectionToDelete(null);
                }}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmColor="error"
            />
        </MainCard>
    );
};

export default CollectionList;
