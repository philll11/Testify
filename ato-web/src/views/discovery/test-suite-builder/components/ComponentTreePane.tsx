import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  CircularProgress,
  Typography,
  Stack,
  Checkbox,
  Button
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import FolderIcon from '@mui/icons-material/Folder';
// import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useTestSuiteBuilderContext } from '../context/TestSuiteBuilderContext';
import { usePlatformProfiles } from 'hooks/platform/usePlatform';
import { useDiscoveryComponents, useTriggerSync } from 'hooks/discovery/useDiscovery';
import { ComponentTreeNode } from 'types/discovery/discovery';

const RecursiveTreeItem = ({
  node,
  selectedNodeIds,
  onToggle
}: {
  node: ComponentTreeNode;
  selectedNodeIds: string[];
  onToggle: (id: string, isSelected: boolean, nodeDetail: ComponentTreeNode) => void;
}) => {
  // Determine if it's a folder or leaf
  const isFolder = node.nodeType === 'folder';
  const isSelected = selectedNodeIds.includes(node.id);

  return (
    <TreeItem
      itemId={node.id}
      label={
        <Stack direction="row" alignItems="center" spacing={1}>
          <Checkbox
            size="small"
            checked={isSelected}
            onChange={(e) => onToggle(node.id, e.target.checked, node)}
            onClick={(e) => e.stopPropagation()}
          />
          {isFolder ? <FolderIcon color="primary" fontSize="small" /> : <InsertDriveFileIcon color="action" fontSize="small" />}
          <Typography variant="body2">{node.name}</Typography>
        </Stack>
      }
    >
      {node.children &&
        node.children.map((child) => (
          <RecursiveTreeItem key={child.id} node={child} selectedNodeIds={selectedNodeIds} onToggle={onToggle} />
        ))}
    </TreeItem>
  );
};

const flattenNodes = (node: ComponentTreeNode): ComponentTreeNode[] => {
  let list = [node];
  if (node.children) {
    node.children.forEach((child) => {
      list = list.concat(flattenNodes(child));
    });
  }
  return list;
};

export const ComponentTreePane = () => {
  const {
    profileId,
    setProfileId,
    isTestMode,
    setIsTestMode,
    searchQuery,
    setSearchQuery,
    selectedNodeIds,
    setSelectedNodeIds,
    setManifestList,
    manifestList
  } = useTestSuiteBuilderContext();

  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery]);

  // Data fetching
  const { data: profiles } = usePlatformProfiles();

  // Profiles are used to configure target environment variables, show loading if desired
  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError
  } = useDiscoveryComponents({
    profileId,
    isTest: isTestMode,
    search: searchQuery || undefined
  });

  const { mutate: handleSync, isPending: isSyncing } = useTriggerSync();

  // When toggling a node, we apply cascading selection behavior
  const handleToggle = (_id: string, isSelected: boolean, nodeDetail: ComponentTreeNode) => {
    const affectedNodes = flattenNodes(nodeDetail);
    const affectedIds = new Set(affectedNodes.map((n) => n.id));

    if (isSelected) {
      // Add all affected nodes that are not currently selected
      const newIdsSet = new Set(selectedNodeIds);
      const newManifest = [...manifestList];

      affectedNodes.forEach((node) => {
        if (!newIdsSet.has(node.id)) {
          newIdsSet.add(node.id);
          if (node.nodeType === 'component') {
            newManifest.push(node);
          }
        }
      });

      setSelectedNodeIds(Array.from(newIdsSet));
      setManifestList(newManifest);
    } else {
      // Remove affected nodes
      setSelectedNodeIds(selectedNodeIds.filter((existingId) => !affectedIds.has(existingId)));
      setManifestList(manifestList.filter((item) => !affectedIds.has(item.id)));
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Component Explorer</Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="caption" color="textSecondary">
            Last Synced: Unknown
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={isSyncing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => handleSync()}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Database'}
          </Button>
        </Stack>
      </Stack>
      <Box display="flex" flexDirection="column" gap={2}>
        <FormControl fullWidth size="small">
          <InputLabel id="profile-select-label">Platform Profile</InputLabel>
          <Select
            labelId="profile-select-label"
            value={profileId || ''}
            label="Platform Profile"
            onChange={(e) => setProfileId(e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {profiles?.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <FormControlLabel control={<Switch checked={isTestMode} onChange={(e) => setIsTestMode(e.target.checked)} />} label="Test Mode" />
        </Stack>

        <TextField fullWidth size="small" label="Search Components" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 400,
          maxHeight: 600,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1
        }}
      >
        {treeLoading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}
        {treeError && <Typography color="error">Error loading components</Typography>}

        {!treeLoading && !treeError && (!treeData || treeData.length === 0) && (
          <Typography color="textSecondary" align="center" sx={{ mt: 2 }}>
            No components found.
          </Typography>
        )}

        {!treeLoading && !treeError && treeData && treeData.length > 0 && (
          <SimpleTreeView>
            {treeData.map((node) => (
              <RecursiveTreeItem key={node.id} node={node} selectedNodeIds={selectedNodeIds} onToggle={handleToggle} />
            ))}
          </SimpleTreeView>
        )}
      </Box>
    </Box>
  );
};
