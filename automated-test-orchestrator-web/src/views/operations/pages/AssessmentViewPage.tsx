import { useNavigate, useParams } from 'react-router-dom';
import { IconButton, Stack, Tooltip, useTheme, Button, Box, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions } from '@mui/material';
import { IconEdit, IconTrash, IconCheck, IconLockOpen } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import AssessmentForm from '../AssessmentForm';
import { useDeleteAssessment, useGetAssessment, useUpdateAssessment } from 'hooks/operations/useAssessments';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { useState } from 'react';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { AssessmentStatus } from 'types/operations/assessment.types';

const AssessmentViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    // Navigation & Permissions
    const { goBack, getLinkTo } = useContextualNavigation('/assessments');
    const { can } = usePermission();

    // Data Hooks
    const { data: assessment, isLoading, error } = useGetAssessment(id!);
    const { mutateAsync: deleteAssessment } = useDeleteAssessment();
    const { mutateAsync: updateAssessment } = useUpdateAssessment();

    // Local State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
    const [reopenReason, setReopenReason] = useState('');

    // Handlers
    const handleEdit = () => {
        if (!id) return;
        navigate(getLinkTo('edit', { strategy: 'stack' }));
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteAssessment(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete assessment', error);
        }
    };

    const handleComplete = async () => {
        if (!assessment) return;
        try {
            await updateAssessment({
                id: assessment._id,
                data: { status: AssessmentStatus.COMPLETED, __v: assessment.__v }
            });
        } catch (error) {
            console.error('Failed to complete assessment', error);
        }
    };

    const handleReopenSubmit = async () => {
        if (!reopenReason.trim() || !assessment) return;
        try {
            await updateAssessment({
                id: assessment._id,
                data: {
                    status: AssessmentStatus.IN_PROGRESS,
                    changeReason: reopenReason,
                    __v: assessment.__v
                }
            });
            setReopenDialogOpen(false);
            setReopenReason('');
        } catch (error) {
            console.error('Failed to reopen assessment', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!assessment) return <MainCard title="Error">Assessment not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading assessment</MainCard>;

    const isCompleted = assessment.status === AssessmentStatus.COMPLETED;
    const canComplete = can(PERMISSIONS.ASSESSMENT_EDIT) && !isCompleted && assessment.samples && assessment.samples.length > 0;
    const canReopen = can(PERMISSIONS.ASSESSMENT_EDIT) && isCompleted;

    return (
        <MainCard
            title={assessment.name}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {/* Reopen Button */}
                    {canReopen && (
                        <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            onClick={() => setReopenDialogOpen(true)}
                            startIcon={<IconLockOpen size={18} />}
                            sx={{ mr: 1 }}
                        >
                            Reopen
                        </Button>
                    )}

                    {/* Complete Button */}
                    {canComplete && (
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={handleComplete}
                            startIcon={<IconCheck size={18} />}
                            sx={{ mr: 1 }}
                        >
                            Complete
                        </Button>
                    )}

                    {can(PERMISSIONS.ASSESSMENT_EDIT) && !isCompleted && (
                        <Tooltip title="Edit Assessment">
                            <IconButton
                                onClick={handleEdit}
                                size="large"
                                sx={{ color: theme.palette.primary.main }}
                            >
                                <IconEdit stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {can(PERMISSIONS.ASSESSMENT_DELETE) && !isCompleted && (
                        <Tooltip title="Delete Assessment">
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
            <AssessmentForm
                mode="view"
                assessment={assessment}
                onSubmit={() => { }}
                isLoading={isLoading}
                onCancel={() => goBack()}
            />
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Assessment"
                content={`Are you sure you want to delete assessment "${assessment.name}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                confirmColor="error"
            />
            {/* Reopen Dialog */}
            <Dialog open={reopenDialogOpen} onClose={() => setReopenDialogOpen(false)}>
                <DialogTitle>Reopen Assessment</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Reopening a completed assessment requires a reason. This action will be logged in the audit trail.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="reason"
                        label="Reason for Change"
                        fullWidth
                        variant="outlined"
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReopenDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleReopenSubmit} disabled={!reopenReason.trim()} color="warning">
                        Reopen & Unlock
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>

    );
};

export default AssessmentViewPage;
