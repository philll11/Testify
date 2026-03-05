import { FC } from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Chip, Divider } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ScienceIcon from '@mui/icons-material/Science';

import { Collection, CollectionType, CollectionItem } from 'types/collections/collection.types';
import { BOOMI_COMPONENT_LABELS } from 'constants/boomi';

interface CoverageManifestViewProps {
  collection: Collection;
}

export const CoverageManifestView: FC<CoverageManifestViewProps> = ({ collection }) => {

  const getSourceType = (componentId: string) => {
    const item = collection.items?.find(i => i.componentId === componentId);
    return item?.sourceType;
  };

  const renderTestsFlat = (manifest: any[]) => {
    return (
      <List>
        {manifest.map((testComp) => {
          return (
            <ListItem key={testComp.id || testComp.componentId}>
              <ListItemIcon>
                <ScienceIcon color="secondary" />
              </ListItemIcon>
              <ListItemText primary={testComp.name || testComp.componentId} secondary={testComp.path || 'Direct Test Selection'} />
            </ListItem>
          );
        })}
      </List>
    );
  };

  const renderTargetsNested = (manifest: any[]) => {
    return (
      <List>
        {manifest.map((item) => {
          const mainName = item.targetName || item.targetId;
          const mappedTests = item.tests || [];
          const sourceType = getSourceType(item.targetId);

          return (
            <Box key={item.targetId} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <InsertDriveFileIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  {mainName}
                </Typography>
                {item.targetPlatform && <Chip size="small" label={BOOMI_COMPONENT_LABELS[item.targetPlatform] || item.targetPlatform} sx={{ ml: 1 }} />}
                {sourceType === 'DISCOVERED' && (
                  <Chip size="small" label="Auto-Discovered" color="info" variant="outlined" sx={{ ml: 1 }} />
                )}
              </Box>
              <Typography variant="body2" color="textSecondary" mb={2}>
                {item.targetPath || 'Path unavailable'}
              </Typography>

              <Divider sx={{ mb: 1 }} />

              <Typography variant="caption" fontWeight="bold" color="textSecondary" textTransform="uppercase">
                Mapped Tests ({mappedTests.length})
              </Typography>

              {mappedTests.length > 0 ? (
                <List dense>
                  {mappedTests.map((t: any) => (
                    <ListItem key={t.testId} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ScienceIcon color="secondary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t.testName} secondary={t.testPath} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="error" mt={1}>
                  No tests mapped for this component in the Test Registry.
                </Typography>
              )}
            </Box>
          );
        })}
      </List>
    );
  };

  const manifest = collection.manifest || [];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Execution Manifest
      </Typography>

      {manifest.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No components found in manifest.
        </Typography>
      ) : collection.collectionType === CollectionType.TESTS ? (
        renderTestsFlat(manifest)
      ) : (
        renderTargetsNested(manifest)
      )}
    </Box>
  );
};
