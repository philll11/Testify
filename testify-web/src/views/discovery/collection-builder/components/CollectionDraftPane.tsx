import { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  TextField,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Tooltip from '@mui/material/Tooltip';
import { useCollectionBuilderContext } from '../context/CollectionBuilderContext';
import { useEnvironmentContext } from 'contexts/EnvironmentContext';
import { useCreateCollection } from 'hooks/collections/useCollections';
import { getNodeIcon } from './ComponentTreePane';
import { BOOMI_COMPONENT_LABELS } from 'constants/boomi';
import { CollectionType } from 'types/collections/collection.types';

export const CollectionDraftPane = () => {
  const navigate = useNavigate();
  const { selectedItems, setSelectedItems, toggleNodeSelection, setSelectedNodeIds, profileId, collectionType } =
    useCollectionBuilderContext();

  const [name, setName] = useState<string>('');
  const [dependencyDiscovery, setDependencyDiscovery] = useState<boolean>(false);
  const { activeEnvironmentId } = useEnvironmentContext();

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const { mutate: createCollection, isPending: isCreating } = useCreateCollection();

  const handleRemoveItem = (id: string) => {
    toggleNodeSelection(id, false);
    setSelectedItems(selectedItems.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setSelectedItems([]);
    setSelectedNodeIds([]);
    setCheckedIds([]);
    setIsEditMode(false);
  };

  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setCheckedIds(selectedItems.map((item) => item.id));
    } else {
      setCheckedIds([]);
    }
  };

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleRemoveSelected = () => {
    const idsToRemove = new Set(checkedIds);
    checkedIds.forEach((id) => toggleNodeSelection(id, false));
    setSelectedItems(selectedItems.filter((item) => !idsToRemove.has(item.id)));
    setCheckedIds([]);
    setIsEditMode(false);
  };

  const handleConfirmSelection = () => {
    createCollection(
      {
        name: name.trim() || 'Untitled Collection',
        collectionType: collectionType as CollectionType,
        environmentId: activeEnvironmentId || undefined,
        componentIds: selectedItems.map((item) => item.id),
        crawlDependencies: collectionType === 'TARGETS' ? dependencyDiscovery : undefined
      },
      {
        onSuccess: (data) => {
          navigate(`/collections/${data.id}`);
        }
      }
    );
  };

  return (
    <Box display="flex" flexDirection="column" gap={3} height="100%">
      <Typography variant="h4">Component Selection</Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        <TextField
          fullWidth
          size="small"
          label="Collection Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a recognizable name..."
        />

        {collectionType === 'TARGETS' && (
          <FormControlLabel
            control={<Checkbox checked={dependencyDiscovery} onChange={(e) => setDependencyDiscovery(e.target.checked)} />}
            label="Enable Intelligent Dependency Discovery"
          />
        )}
      </Box>

      <Divider />

      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minHeight: 40 }}>
        {!isEditMode ? (
          <>
            <Typography variant="subtitle1">Selected Components ({selectedItems.length})</Typography>
            <Box>
              {selectedItems.length > 0 && (
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
                checked={checkedIds.length > 0 && checkedIds.length === selectedItems.length}
                indeterminate={checkedIds.length > 0 && checkedIds.length < selectedItems.length}
                onChange={handleSelectAll}
                size="small"
                sx={{ p: 0.5, mr: 1 }}
              />
              <Typography variant="subtitle2">{checkedIds.length} Selected</Typography>
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
        {selectedItems.length === 0 ? (
          <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
            No components selected.
          </Typography>
        ) : (
          <List dense disablePadding>
            {selectedItems.map((item) => (
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
                      <Checkbox edge="start" checked={checkedIds.includes(item.id)} tabIndex={-1} disableRipple size="small" />
                    </ListItemIcon>
                  ) : (
                    <ListItemIcon sx={{ minWidth: 36 }}>{getNodeIcon(item)}</ListItemIcon>
                  )}

                  <ListItemText
                    primary={
                      <Box component="span" display="flex" alignItems="center">
                        {item.name}
                        {item.nodeType === 'component' && item.data?.type && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({BOOMI_COMPONENT_LABELS[item.data.type] || item.data.type})
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={item.id}
                    slotProps={{
                      primary: { variant: 'body2', component: 'div' } as any,
                      secondary: { variant: 'caption', noWrap: true }
                    }}
                  />
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Tooltip
        title={
          !activeEnvironmentId && dependencyDiscovery && collectionType === 'TARGETS'
            ? 'A global environment must be selected from the header to enable dependency discovery.'
            : ''
        }
        placement="top"
      >
        <span>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <RocketLaunchIcon />}
            disabled={
              selectedItems.length === 0 ||
              (!activeEnvironmentId && dependencyDiscovery && collectionType === 'TARGETS') ||
              !name.trim() ||
              isCreating
            }
            onClick={handleConfirmSelection}
          >
            {isCreating ? 'Creating...' : 'Create Collection'}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};
