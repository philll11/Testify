import { FC, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Chip, Grid, Divider, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import MainCard from 'ui-component/cards/MainCard';
import { useGetCollection, useExecuteCollection } from 'hooks/collections/useCollections';
import { useEnvironmentContext } from 'contexts/EnvironmentContext';
import { usePlatformEnvironments, usePlatformProfiles } from 'hooks/platform/usePlatform';
import { CoverageManifestView } from '../components/CoverageManifestView';

const CollectionDetailsPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: collection, isLoading, error } = useGetCollection(id || '');
  const { mutate: executeCollection, isPending: isExecuting } = useExecuteCollection();
  const { activeEnvironmentId } = useEnvironmentContext();
  const { data: environments } = usePlatformEnvironments();
  const { data: profiles } = usePlatformProfiles();

  // Determine standard execution validation guardrails
  const validationState = useMemo(() => {
    if (!collection || !activeEnvironmentId || !environments) {
      return { isValid: false, reason: 'Please select an environment from the top header to execute.' };
    }

    const activeEnv = environments.find(e => e.id === activeEnvironmentId);
    if (!activeEnv) {
      return { isValid: false, reason: 'Selected environment is invalid.' };
    }

    // Attempt to evaluate profile ID mismatch if manifest exists
    if (collection.manifest && collection.manifest.length > 0) {
      const manifestProfileIds = new Set<string>();

      // In tests mode, manifest contains DiscoveredComponents directly. In targets mode, it's an object with a profileId.
      collection.manifest.forEach((item: any) => {
        if (item.profileId) {
          manifestProfileIds.add(item.profileId);
        }
      });

      if (manifestProfileIds.size > 0 && !manifestProfileIds.has(activeEnv.profileId)) {
        const requiredProfile = profiles?.find(p => manifestProfileIds.has(p.id));
        return {
          isValid: false,
          reason: `Profile mismatch. This collection requires a ${requiredProfile?.name || 'different'} environment.`
        };
      }
    }

    return { isValid: true, reason: '' };
  }, [collection, activeEnvironmentId, environments, profiles]);

  const activeEnvDisplay = useMemo(() => {
    if (!activeEnvironmentId || !environments) return 'None Selected';
    const env = environments.find(e => e.id === activeEnvironmentId);
    return env ? env.name : 'Unknown';
  }, [activeEnvironmentId, environments]);

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
    if (id && activeEnvironmentId) {
      executeCollection({ id, environmentId: activeEnvironmentId });
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

            <Box>
              <Typography variant="caption" color="textSecondary">
                Target Environment
              </Typography>
              <Typography variant="body2" fontWeight={600} color={activeEnvironmentId ? 'textPrimary' : 'error'}>
                {activeEnvDisplay}
              </Typography>
            </Box>

            <Tooltip title={!validationState.isValid ? validationState.reason : ''} placement="top">
              <span>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={isExecuting ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                  onClick={handleExecute}
                  disabled={isExecuting || collection.status === 'EXECUTING' || !validationState.isValid}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Execute Now
                </Button>
              </span>
            </Tooltip>
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
