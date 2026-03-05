import { FC } from 'react';
import { Box, Typography, Chip, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import { useGetTestResults } from '../../../hooks/test-results/useTestResults';
import { TestResultStatus } from '../../../types/test-results/test-result.types';

interface TestResultsReportProps {
    collectionId: string;
    isExecuting: boolean;
}

export const TestResultsReport: FC<TestResultsReportProps> = ({ collectionId, isExecuting }) => {
    const { data: results, isLoading, error } = useGetTestResults(
        { collectionId },
        {
            refetchInterval: (query: any) => {
                if (!isExecuting) return false;

                // React Query v5 passes the Query object, v4 passed the data directly
                const currentData = query?.state?.data ?? query;

                if (Array.isArray(currentData) && currentData.length > 0) {
                    const isFinished = currentData.every((r: any) => [TestResultStatus.PASSED, TestResultStatus.FAILED, TestResultStatus.ERROR].includes(r.status));
                    if (isFinished) return false;
                }
                return 3000;
            },
        }
    );

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">Failed to load test results.</Alert>;
    }

    if (!results || results.length === 0) {
        return <Typography color="textSecondary">No test results found for this collection.</Typography>;
    }

    const passedCount = results.filter(r => r.status === TestResultStatus.PASSED).length;
    const failedCount = results.filter(r => r.status === TestResultStatus.FAILED).length;
    const errorCount = results.filter(r => r.status === TestResultStatus.ERROR).length;
    const pendingCount = results.filter(r => [TestResultStatus.PENDING, TestResultStatus.RUNNING].includes(r.status)).length;

    const getStatusIcon = (status: TestResultStatus) => {
        switch (status) {
            case TestResultStatus.PASSED: return <CheckCircleIcon color="success" />;
            case TestResultStatus.FAILED: return <CancelIcon color="error" />;
            case TestResultStatus.ERROR: return <ErrorIcon color="error" />;
            default: return <HourglassEmptyIcon color="action" />;
        }
    };

    const getStatusColor = (status: TestResultStatus) => {
        switch (status) {
            case TestResultStatus.PASSED: return 'success';
            case TestResultStatus.FAILED: return 'error';
            case TestResultStatus.ERROR: return 'error';
            case TestResultStatus.RUNNING: return 'info';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                <Chip label={`Total: ${results.length}`} variant="outlined" />
                <Chip label={`Passed: ${passedCount}`} color="success" variant={passedCount > 0 ? 'filled' : 'outlined'} />
                <Chip label={`Failed: ${failedCount}`} color="error" variant={failedCount > 0 ? 'filled' : 'outlined'} />
                {errorCount > 0 && <Chip label={`Errors: ${errorCount}`} color="error" />}
                {pendingCount > 0 && <Chip label={`Pending/Running: ${pendingCount}`} color="info" />}
            </Box>

            {results.map((result) => (
                <Accordion key={result.id} sx={{ mb: 1, borderLeft: 4, borderColor: `${getStatusColor(result.status)}.main` }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={1}>
                                {getStatusIcon(result.status)}
                                <Typography variant="subtitle1" fontWeight="medium">
                                    {result.testName || result.testId}
                                </Typography>
                            </Box>
                            <Chip label={result.status} color={getStatusColor(result.status)} size="small" />
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Typography variant="body2" color="textSecondary">
                                Path: {result.testPath || 'N/A'}
                            </Typography>
                            {result.errorMessage && (
                                <Alert severity="error" sx={{ mt: 1 }}>{result.errorMessage}</Alert>
                            )}
                            {result.rawResult && (
                                <Box mt={1} p={2} bgcolor="grey.100" borderRadius={1} overflow="auto">
                                    <Typography variant="caption" component="pre" sx={{ margin: 0 }}>
                                        {JSON.stringify(result.rawResult, null, 2)}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
};
