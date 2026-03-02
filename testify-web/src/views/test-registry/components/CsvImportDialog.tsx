import { ChangeEvent, FC, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress } from '@mui/material';
import Papa from 'papaparse';
import { useImportTestRegistry } from 'hooks/test-registry/useTestRegistry';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CsvImportDialog: FC<CsvImportDialogProps> = ({ open, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: importMappings, isPending } = useImportTestRegistry();

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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappings = results.data.map((row: any) => ({
          targetComponentId: row.targetComponentId?.trim(),
          testComponentId: row.testComponentId?.trim()
        }));

        const invalidRows = mappings.filter((m) => !m.targetComponentId || !m.testComponentId);
        if (invalidRows.length > 0) {
          setError('Invalid CSV format. Ensure targetComponentId and testComponentId headers exist and are non-empty.');
          return;
        }

        importMappings(
          { mappings },
          {
            onSuccess: () => {
              handleClose();
            }
          }
        );
      },
      error: (parseError) => {
        setError(`Failed to parse CSV: ${parseError.message}`);
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Test Mappings</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <Typography variant="body2" color="textSecondary">
            Please upload a CSV file with the headers <strong>targetComponentId</strong> and <strong>testComponentId</strong>.
          </Typography>

          <Button variant="outlined" component="label">
            {file ? file.name : 'Choose CSV File'}
            <input type="file" hidden accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
          </Button>

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!file || isPending}
          variant="contained"
          startIcon={isPending ? <CircularProgress size={20} /> : undefined}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};
