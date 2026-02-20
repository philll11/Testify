import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    Stack,
    Typography,
    LinearProgress,
    Alert
} from '@mui/material';
import { IconTrash, IconPlus, IconBrandCodesandbox } from '@tabler/icons-react';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { gridSpacing } from 'store/constant';

import { useGetCredentials, useCreateCredential, useDeleteCredential } from 'hooks/iam/useCredentials';
import { createCredentialSchema, CreateCredentialSchema } from 'types/iam/credential.schema';

const PlatformCredentialsTab = () => {
    // Queries & Mutations
    const { data: credentials, isLoading } = useGetCredentials();
    const { mutate: createCredential, isPending: isCreating } = useCreateCredential();
    const { mutate: deleteCredential, isPending: isDeleting } = useDeleteCredential();

    // Dialog & Form State
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateCredentialSchema>({
        resolver: zodResolver(createCredentialSchema),
        defaultValues: {
            profileName: '',
            platform: 'Boomi',
            accountId: '',
            username: '',
            passwordOrToken: '',
            executionInstanceId: ''
        }
    });

    // Handlers
    const handleCloseAddDialog = () => {
        setOpenAddDialog(false);
        reset();
    };

    const onSubmit = (data: CreateCredentialSchema) => {
        createCredential(data, {
            onSuccess: () => {
                handleCloseAddDialog();
            }
        });
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const handleConfirmDelete = () => {
        if (deleteId) {
            deleteCredential(deleteId, {
                onSuccess: () => setDeleteId(null)
            });
        }
    };

    return (
        <>
            <SubCard
                title={
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Typography variant="h4">Platform Credentials</Typography>
                        <AnimateButton>
                            <Button
                                variant="contained"
                                startIcon={<IconPlus size={18} />}
                                onClick={() => setOpenAddDialog(true)}
                            >
                                Add Credential
                            </Button>
                        </AnimateButton>
                    </Stack>
                }
            >
                {isLoading && <LinearProgress />}
                {!isLoading && (!credentials || credentials.length === 0) && (
                    <Alert severity="info">No platform credentials found. Add one to get started.</Alert>
                )}
                {!isLoading && credentials && credentials.length > 0 && (
                    <TableContainer component={Paper} elevation={0} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Profile Name</TableCell>
                                    <TableCell>Platform</TableCell>
                                    <TableCell>Username</TableCell>
                                    <TableCell>Account ID</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {credentials.map((cred) => (
                                    <TableRow key={cred.id}>
                                        <TableCell component="th" scope="row">
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <IconBrandCodesandbox size={18} />
                                                <Typography variant="subtitle1">{cred.profileName}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{cred.platform}</TableCell>
                                        <TableCell>{cred.username}</TableCell>
                                        <TableCell>{cred.accountId}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDeleteClick(cred.id)}
                                                    size="small"
                                                >
                                                    <IconTrash size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </SubCard>

            {/* Add Credential Dialog */}
            <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle>Add Platform Credential</DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={gridSpacing}>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="profileName"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Profile Name"
                                            placeholder="e.g. My Production Config"
                                            error={!!errors.profileName}
                                            helperText={errors.profileName?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="platform"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Platform"
                                            disabled // Fixed to Boomi for now as per schema default, or editable if needed
                                            error={!!errors.platform}
                                            helperText={errors.platform?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="accountId"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Account ID"
                                            error={!!errors.accountId}
                                            helperText={errors.accountId?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="username"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Username"
                                            error={!!errors.username}
                                            helperText={errors.username?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="passwordOrToken"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            type="password"
                                            label="Password or Token"
                                            error={!!errors.passwordOrToken}
                                            helperText={errors.passwordOrToken?.message || "Stored securely and never returned by the API."}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="executionInstanceId"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Execution Instance ID (Optional)"
                                            placeholder="e.g. atom-123"
                                            error={!!errors.executionInstanceId}
                                            helperText={errors.executionInstanceId?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseAddDialog}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={isCreating}>
                            Create
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteId}
                title="Delete Credential"
                content="Are you sure you want to delete this credential profile? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteId(null)}
                confirmColor="error"
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
            />
        </>
    );
};

export default PlatformCredentialsTab;
