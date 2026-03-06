import { ChangeEvent, FC, useRef, useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress, LinearProgress } from '@mui/material';
import Papa from 'papaparse';
import { useImportTestRegistry } from 'hooks/test-registry/useTestRegistry';
import { useEnvironmentContext } from 'contexts/EnvironmentContext';
import { usePlatformEnvironments } from 'hooks/platform/useEnvironments';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getJobStatus } from 'api/system/jobs';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CsvImportDialog: FC<CsvImportDialogProps> = ({ open, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { mutate: importMappings, isPending: isStartingImport } = useImportTestRegistry();
  const { triggerEnvironmentWarning, activeEnvironmentId } = useEnvironmentContext();
  const { data: environments } = usePlatformEnvironments();

  const activeEnv = environments?.find((e) => e.id === activeEnvironmentId);
  const profileId = activeEnv?.profileId;

  const { data: jobStatus, isFetching: isJobPolling } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data;
      return (state?.status === 'completed' || state?.status === 'failed') ? false : 1000;
    },
  });

  useEffect(() => {
    if (jobStatus?.status === 'completed') {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['test-registry'] });
        handleClose();
      }, 2000);
    } else if (jobStatus?.status === 'failed') {
      setError('Import failed: ' + jobStatus.failedReason);
    }
  }, [jobStatus?.status]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError('Please select a file to import.');
      return;
    }
    if (!profileId || !activeEnvironmentId) {
      triggerEnvironmentWarning();
      setError('No active environment selected. Please select one globally first.');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappings = results.data.map((row: any) => ({
          profileId,
          environmentId: activeEnvironmentId,
          targetComponentId: row.targetComponentId?.trim(),
          testComponentId: row.testComponentId?.trim()
        }));

        const invalidRows = mappings.filter((m) => !m.targetComponentId || !m.testComponentId);
        if (invalidRows.length > 0) {
          setError('Invalid CSV format. Ensure targetComponentId and testComponentId headers exist and are non-empty.');
          return;
        }

        importMappings(
          { mappings, environmentId: activeEnvironmentId },
          {
            onSuccess: (data: any) => {
              if (data?.jobId) {
                setJobId(data.jobId);
              } else {
                handleClose();
              }
            }
          }
        );
      },
      error: (parseError) => {
        setError("Failed to parse CSV: " + parseError.message);
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setJobId(null);
    onClose();
  };

  const isWorking = isStartingImport || (jobId !== null && jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed');
  const progressPercent = typeof jobStatus?.progress === 'number' ? jobStatus.progress : undefined;

  return (
    <Dialog open={open} onClose={isWorking ? undefined : handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Test Mappings</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          {!jobId && (
            <>
              <Typography variant="body2" color="textSecondary">
                Please upload a CSV file with the headers <strong>targetComponentId</strong> and <strong>testComponentId</strong>.
              </Typography>

              <Button variant="outlined" component="label" disabled={isWorking}>
                {file ? file.name : 'Choose CSV File'}
                <input type="file" hidden accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
              </Button>
            </>
          )}

          {jobId && (
            <Box>
              <Typography variant="body2" mb={1}>
                {jobStatus?.status === 'completed' ? 'Import completed! Finishing up...' : 'Importing mappings...'}
              </Typography>
              <LinearProgress variant={progressPercent !== undefined ? "determinate" : "indeterminate"} value={progressPercent} />
              {progressPercent !== undefined && (
                <Typography variant="caption" display="block" ml={1} mt={1}>{Math.round(progressPercent)}%</Typography>
              )}
            </Box>
          )}

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isWorking}>
          Cancel
        </Button>
        {!jobId && (
          <Button
            onClick={handleImport}
            disabled={!file || isWorking}
            variant="contained"
            startIcon={isWorking ? <CircularProgress size={20} /> : undefined}
          >
            Import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

