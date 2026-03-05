import { useState, useEffect, memo, ChangeEvent } from 'react';
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
  Button,
  FormHelperText,
  IconButton
} from '@mui/material';
import { Tree, NodeRendererProps } from 'react-arborist';
import useMeasure from 'react-use-measure';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScienceIcon from '@mui/icons-material/Science';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { useCollectionBuilderContext } from '../context/CollectionBuilderContext';
import { usePlatformEnvironments } from 'hooks/platform/usePlatform';
import { useEnvironmentContext } from 'contexts/EnvironmentContext';
import { useDiscoveryComponents, useTriggerSync, useSyncStatus, useGlobalSyncState } from 'hooks/discovery/useDiscovery';
import { ComponentTreeNode } from 'types/discovery/discovery';
import { BOOMI_COMPONENT_ICONS, BOOMI_COMPONENT_LABELS } from 'constants/boomi';
import { useSnackbar } from 'contexts/SnackbarContext';

export const getNodeIcon = (node: ComponentTreeNode) => {
  if (node.nodeType === 'folder') {
    return <FolderIcon color="primary" fontSize="small" />;
  }

  const data = node.data;
  if (!data) return <InsertDriveFileIcon color="action" fontSize="small" />;

  // Test Process 🧪
  if (data.isTest) {
    return <ScienceIcon color="secondary" fontSize="small" />;
  }

  // Regular components by type mapped from boomi constants
  const ComponentTypeIcon = BOOMI_COMPONENT_ICONS[data.type];
  if (ComponentTypeIcon) {
    return <ComponentTypeIcon color="action" fontSize="small" />;
  }

  return <InsertDriveFileIcon color="action" fontSize="small" />;
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

const ComponentTreeNodeItem = memo(({ node, style }: NodeRendererProps<ComponentTreeNode>) => {
  const { selectedNodeIds, selectedItems, setSelectedNodeIds, setSelectedItems } = useCollectionBuilderContext();
  const nodeData = node.data;

  const isSelected = selectedNodeIds.includes(nodeData.id);

  const handleCheckboxToggle = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const isChecked = e.target.checked;

    const affectedNodes = flattenNodes(nodeData);
    const affectedIds = new Set(affectedNodes.map((n) => n.id));

    if (isChecked) {
      const newIdsSet = new Set(selectedNodeIds);
      const newManifest = [...selectedItems];
      affectedNodes.forEach((n) => {
        if (!newIdsSet.has(n.id)) {
          newIdsSet.add(n.id);
          if (n.nodeType === 'component') newManifest.push(n);
        }
      });
      setSelectedNodeIds(Array.from(newIdsSet));
      setSelectedItems(newManifest);
    } else {
      setSelectedNodeIds(selectedNodeIds.filter((id) => !affectedIds.has(id)));
      setSelectedItems(selectedItems.filter((item) => !affectedIds.has(item.id)));
    }
  };

  return (
    <Box
      style={style}
      onClick={() => node.toggle()}
      sx={{
        display: 'flex',
        alignItems: 'center',
        pl: node.level * 2,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' }
      }}
    >
      {node.isInternal ? (
        <IconButton size="small" disableRipple sx={{ p: 0.5 }}>
          {node.isOpen ? <ExpandMoreIcon fontSize="inherit" /> : <ChevronRightIcon fontSize="inherit" />}
        </IconButton>
      ) : (
        <Box width={24} />
      )}

      <Checkbox size="small" checked={isSelected} onChange={handleCheckboxToggle} onClick={(e) => e.stopPropagation()} />

      {getNodeIcon(nodeData)}

      <Box display="flex" alignItems="center" ml={1} overflow="hidden">
        <Typography variant="body2" noWrap>
          {nodeData.name}
        </Typography>
        {nodeData.nodeType === 'component' && nodeData.data?.type && (
          <Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
            ({BOOMI_COMPONENT_LABELS[nodeData.data.type] || nodeData.data.type})
          </Typography>
        )}
      </Box>
    </Box>
  );
});

const DebouncedSearchInput = ({ initialValue, onSearch }: { initialValue: string; onSearch: (value: string) => void }) => {
  const [localSearch, setLocalSearch] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => onSearch(localSearch), 500);
    return () => clearTimeout(handler);
  }, [localSearch, onSearch]);

  return (
    <TextField fullWidth size="small" label="Search Components" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
  );
};

export const ComponentTreePane = () => {
  const renderStart = performance.now();
  useEffect(() => {
    console.log(`[Perf] ComponentTreePane render committed in ${performance.now() - renderStart}ms`);
  });

  const { showMessage } = useSnackbar();

  const { collectionType, setCollectionType, searchQuery, setSearchQuery } = useCollectionBuilderContext();
  const { activeEnvironmentId, triggerEnvironmentWarning } = useEnvironmentContext();

  // Data fetching
  const { data: environments, isLoading: environmentsLoading } = usePlatformEnvironments();
  const activeEnvironment = environments?.find((env) => env.id === activeEnvironmentId);
  const profileId = activeEnvironment?.profileId;

  // Profiles are used to configure target environment variables, show loading if desired
  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError
  } = useDiscoveryComponents({
    profileId: profileId || '',
    isTest: collectionType === 'TESTS',
    search: searchQuery || undefined
  });

  const { mutate: handleSync, isPending: isTriggeringSync } = useTriggerSync();
  const { data: syncStatus } = useSyncStatus();
  const { isRunning: isSyncing } = useGlobalSyncState();

  const isSyncActive = isTriggeringSync || isSyncing;

  const [ref, bounds] = useMeasure();

  return (
    <Box display="flex" flexDirection="column" gap={3} height="100%">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Component Explorer</Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="caption" color="textSecondary">
            Last Synced: {syncStatus?.lastSyncDate ? new Date(syncStatus.lastSyncDate).toLocaleString() : 'Unknown'}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={isSyncActive ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => {
              if (!activeEnvironmentId) {
                triggerEnvironmentWarning();
                return;
              }
              handleSync({ environmentId: activeEnvironmentId }, {
                onSuccess: () => showMessage('Sync job enqueued', 'info'),
                onError: (err: any) => {
                  const errorMsg = err.response?.data?.message || err.message || 'Failed to trigger sync';
                  showMessage(`Sync Trigger Failed: ${errorMsg}`, 'error');
                }
              });
            }}
            disabled={isSyncActive}
          >
            {isSyncActive ? 'Syncing...' : 'Sync Database'}
          </Button>
        </Stack>
      </Stack>
      <Box display="flex" flexDirection="column" gap={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <FormControlLabel
            control={
              <Switch checked={collectionType === 'TESTS'} onChange={(e) => setCollectionType(e.target.checked ? 'TESTS' : 'TARGETS')} />
            }
            label={collectionType === 'TESTS' ? 'Test Mode' : 'Targets Mode'}
          />
        </Stack>

        <DebouncedSearchInput initialValue={searchQuery} onSearch={setSearchQuery} />
      </Box>

      <Box
        ref={ref}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        {!activeEnvironmentId ? (
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            Please select a global environment to view and sync components.
          </Typography>
        ) : treeLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : treeError ? (
          <Typography color="error">Error loading components</Typography>
        ) : (!treeData || treeData.length === 0) ? (
          <Typography color="textSecondary" align="center" sx={{ mt: 2 }}>
            No components found.
          </Typography>
        ) : (
          bounds.height > 0 && (
            <Tree data={treeData} width={bounds.width} height={bounds.height} rowHeight={32} searchTerm={searchQuery} openByDefault={false}>
              {ComponentTreeNodeItem}
            </Tree>
          )
        )}
      </Box>
    </Box>
  );
};
