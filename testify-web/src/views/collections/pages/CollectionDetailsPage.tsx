import { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Chip, Grid, Divider } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import MainCard from 'ui-component/cards/MainCard';
import { useGetCollection, useExecuteCollection } from 'hooks/collections/useCollections';
import { CoverageManifestView } from '../components/CoverageManifestView';

const CollectionDetailsPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: collection, isLoading, error } = useGetCollection(id || '');
  const { mutate: executeCollection, isPending: isExecuting } = useExecuteCollection();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !collection) {
    return (
      <Typography color="error" align="center" p={5}>
        Failed to load collection details. It may not exist.
      </Typography>
    );
  }

  const handleExecute = () => {
    if (id) {
      executeCollection({ id });
    }
  };

  return (
    <MainCard
      title={`Collection: ${collection.name}`}
      secondary={
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/collections')}>
          Back to List
        </Button>
      }
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box display="flex" flexDirection="column" gap={2} p={2} bgcolor="background.default" borderRadius={2}>
            <Typography variant="h5">Properties</Typography>
            <Divider />

            <Box>
              <Typography variant="caption" color="textSecondary">
                Status
              </Typography>
              <Box>
                <Chip
                  label={collection.status}
                  color={collection.status === 'COMPLETED' ? 'success' : collection.status === 'FAILED' ? 'error' : 'primary'}
                  size="small"
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary">
                Type
              </Typography>
              <Typography variant="body2">{collection.collectionType}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary">
                Created
              </Typography>
              <Typography variant="body2">{new Date(collection.createdAt).toLocaleString()}</Typography>
            </Box>

            <Button
              variant="contained"
              color="success"
              startIcon={isExecuting ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              onClick={handleExecute}
              disabled={isExecuting || collection.status === 'EXECUTING'}
              fullWidth
              sx={{ mt: 2 }}
            >
              Execute Now
            </Button>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <CoverageManifestView collection={collection} />
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default CollectionDetailsPage;
