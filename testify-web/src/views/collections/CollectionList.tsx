import { useMemo, useState } from 'react';
import { Button, Typography, Tooltip } from '@mui/material';
import { IconPlus, IconTrash, IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useGetCollections, useDeleteCollection } from 'hooks/collections/useCollections';
import { format } from 'date-fns';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import IconButton from '@mui/material/IconButton';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

export const CollectionList = () => {
    const navigate = useNavigate();
    const { can } = usePermission();
    const { data: collections = [], isLoading } = useGetCollections();
    const { mutate: deleteCollection } = useDeleteCollection();
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const columns: GridColDef[] = useMemo(
        () => [
            {
                field: 'name',
                headerName: 'Name',
                flex: 1,
                renderCell: (params: GridRenderCellParams) => (
                    <Typography
                        variant="subtitle2"
                        sx={{ cursor: 'pointer', color: 'primary.main', display: 'flex', alignItems: 'center', height: '100%' }}
                        onClick={() => navigate(`/collections/${params.row.id}`)}
                    >
                        {params.value}
                    </Typography>
                )
            },
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
                renderCell: (params: GridRenderCellParams) => (
                    <>
                        {can(PERMISSIONS.COLLECTION_VIEW) && (
                            <Tooltip title="View Details">
                                <IconButton size="small" color="primary" onClick={() => navigate(`/collections/${params.row.id}`)}>
                                    <IconEye size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {can(PERMISSIONS.COLLECTION_DELETE) && (
                            <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
                                    <IconTrash size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                )
            }
        ],
        [can, navigate]
    );

    return (
        <MainCard
            title="Collections"
            secondary={
                can(PERMISSIONS.COLLECTION_CREATE) && (
                    <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/discovery/collection-builder')}>
                        Build Collection
                    </Button>
                )
            }
        >
            <DataGridWrapper
                rows={collections}
                columns={columns}
                loading={isLoading}
                getRowId={(row: any) => row.id}
                onRowClick={(params) => navigate(`/collections/${params.row.id}`)}
            />

            <ConfirmDialog
                open={!!deleteId}
                title="Delete Collection"
                content="Are you sure you want to delete this collection? This action cannot be undone."
                onConfirm={() => {
                    if (deleteId) {
                        deleteCollection(deleteId);
                        setDeleteId(null);
                    }
                }}
                onCancel={() => setDeleteId(null)}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmColor="error"
            />
        </MainCard>
    );
};

export default CollectionList;
