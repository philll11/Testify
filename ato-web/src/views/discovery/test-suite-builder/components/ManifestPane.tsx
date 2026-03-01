import { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
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
import { getNodeIcon } from './ComponentTreePane';
import { BOOMI_COMPONENT_ICONS, BOOMI_COMPONENT_LABELS } from 'constants/boomi';

export const ManifestPane = () => {
  const { manifestList, setManifestList, toggleNodeSelection, setSelectedNodeIds, profileId } = useTestSuiteBuilderContext();

  const [environmentId, setEnvironmentId] = useState<string>('');
  const [dependencyDiscovery, setDependencyDiscovery] = useState<boolean>(true);

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const { data: environments } = usePlatformEnvironments();

  // Only show environments linked to the selected Profile ID
  const availableEnvironments = environments?.filter((env) => env.profileId === profileId) || [];

  const handleRemoveItem = (id: string) => {
    toggleNodeSelection(id, false);
    setManifestList(manifestList.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setManifestList([]);
    setSelectedNodeIds([]);
    setCheckedIds([]);
    setIsEditMode(false);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setCheckedIds(manifestList.map((item) => item.id));
    } else {
      setCheckedIds([]);
    }
  };

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRemoveSelected = () => {
    const idsToRemove = new Set(checkedIds);
    checkedIds.forEach((id) => toggleNodeSelection(id, false));
    setManifestList(manifestList.filter((item) => !idsToRemove.has(item.id)));
    setCheckedIds([]);
    setIsEditMode(false);
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

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ minHeight: 40 }}
      >
        {!isEditMode ? (
          <>
            <Typography variant="subtitle1">Selected Components ({manifestList.length})</Typography>
            <Box>
              {manifestList.length > 0 && (
                <>
                  <Button size="small" onClick={() => setIsEditMode(true)} sx={{ mr: 1 }}>
                    Edit
                  </Button>
                  <Button size="small" color="error" onClick={handleClearAll} startIcon={<DeleteIcon />}>
                    Clear All
                  </Button>
                </>
              )}
            </Box>
          </>
        ) : (
          <>
            <Box display="flex" alignItems="center">
              <Checkbox
                checked={checkedIds.length > 0 && checkedIds.length === manifestList.length}
                indeterminate={checkedIds.length > 0 && checkedIds.length < manifestList.length}
                onChange={handleSelectAll}
                size="small"
                sx={{ p: 0.5, mr: 1 }}
              />
              <Typography variant="subtitle2">
                {checkedIds.length} Selected
              </Typography>
            </Box>
            <Box>
              <Button size="small" onClick={() => setIsEditMode(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button
                size="small"
                color="error"
                variant="contained"
                onClick={handleRemoveSelected}
                disabled={checkedIds.length === 0}
                startIcon={<DeleteIcon />}
              >
                Remove
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          minHeight: 0
        }}
      >
        {manifestList.length === 0 ? (
          <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
            No components selected.
          </Typography>
        ) : (
          <List dense disablePadding>
            {manifestList.map((item) => (
              <ListItem
                key={item.id}
                disablePadding={isEditMode}
                secondaryAction={
                  !isEditMode && (
                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveItem(item.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )
                }
              >
                <Box
                  onClick={() => isEditMode && handleToggleCheck(item.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    ...(isEditMode && {
                      cursor: 'pointer',
                      px: 2,
                      py: 0.5,
                      '&:hover': { bgcolor: 'action.hover' }
                    })
                  }}
                >
                  {isEditMode ? (
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={checkedIds.includes(item.id)}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                  ) : (
                    <ListItemIcon sx={{ minWidth: 36 }}>{getNodeIcon(item)}</ListItemIcon>
                  )}

                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        {item.name}
                        {item.nodeType === 'component' && item.data?.type && (
                          <Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                            ({BOOMI_COMPONENT_LABELS[item.data.type] || item.data.type})
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={item.id}
                    slotProps={{
                      primary: { variant: 'body2' },
                      secondary: { variant: 'caption', noWrap: true }
                    }}
                  />
                </Box>
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
