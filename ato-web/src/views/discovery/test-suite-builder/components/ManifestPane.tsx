import { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useTestSuiteBuilderContext } from '../context/TestSuiteBuilderContext';
import { usePlatformEnvironments } from 'hooks/platform/usePlatform';

export const ManifestPane = () => {
  const { manifestList, setManifestList, toggleNodeSelection, profileId } = useTestSuiteBuilderContext();

  const [environmentId, setEnvironmentId] = useState<string>('');
  const [dependencyDiscovery, setDependencyDiscovery] = useState<boolean>(true);

  const { data: environments } = usePlatformEnvironments();

  // Only show environments linked to the selected Profile ID
  const availableEnvironments = environments?.filter((env) => env.profileId === profileId) || [];

  const handleRemoveItem = (id: string) => {
    toggleNodeSelection(id, false);
    setManifestList(manifestList.filter((item) => item.id !== id));
  };

  const handleConfirmSelection = () => {
    // Placeholder for submitting the selected items
    console.log({
      profileId,
      environmentId,
      dependencyDiscovery,
      components: manifestList
    });
    alert('Component selection payload built successfully! Check console for details.');
  };

  return (
    <Box display="flex" flexDirection="column" gap={3} height="100%">
      <Typography variant="h4">Suite Manifest</Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        <FormControl fullWidth size="small" disabled={!profileId}>
          <InputLabel id="environment-select-label">Execution Environment</InputLabel>
          <Select
            labelId="environment-select-label"
            value={environmentId}
            label="Execution Environment"
            onChange={(e) => setEnvironmentId(e.target.value)}
          >
            {availableEnvironments.map((env) => (
              <MenuItem key={env.id} value={env.id}>
                {env.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Checkbox checked={dependencyDiscovery} onChange={(e) => setDependencyDiscovery(e.target.checked)} />}
          label="Enable Intelligent Dependency Discovery"
        />
      </Box>

      <Divider />

      <Typography variant="subtitle1">Selected Components ({manifestList.length})</Typography>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          minHeight: 250,
          maxHeight: 400
        }}
      >
        {manifestList.length === 0 ? (
          <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
            No components selected.
          </Typography>
        ) : (
          <List dense>
            {manifestList.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveItem(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={item.name}
                  secondary={item.id}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<RocketLaunchIcon />}
        disabled={manifestList.length === 0 || !environmentId}
        onClick={handleConfirmSelection}
      >
        Create Test Suite
      </Button>
    </Box>
  );
};
