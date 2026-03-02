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
  const renderTestsFlat = (items: CollectionItem[]) => {
    return (
      <List>
        {items.map((item) => {
          const testComp = item.targetComponent;
          return (
            <ListItem key={item.id}>
              <ListItemIcon>
                <ScienceIcon color="secondary" />
              </ListItemIcon>
              <ListItemText primary={testComp?.name || item.componentId} secondary={testComp?.path || 'Direct Test Selection'} />
            </ListItem>
          );
        })}
      </List>
    );
  };

  const renderTargetsNested = (items: CollectionItem[]) => {
    return (
      <List>
        {items.map((item) => {
          const mainComp = item.targetComponent;
          const mappedTests = item.tests || [];

          return (
            <Box key={item.id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <InsertDriveFileIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  {mainComp?.name || item.componentId}
                </Typography>
                {mainComp?.type && <Chip size="small" label={BOOMI_COMPONENT_LABELS[mainComp.type] || mainComp.type} sx={{ ml: 1 }} />}
                {item.sourceType === 'DISCOVERED' && (
                  <Chip size="small" label="Auto-Discovered" color="info" variant="outlined" sx={{ ml: 1 }} />
                )}
              </Box>
              <Typography variant="body2" color="textSecondary" mb={2}>
                {mainComp?.path || 'Path unavailable'}
              </Typography>

              <Divider sx={{ mb: 1 }} />

              <Typography variant="caption" fontWeight="bold" color="textSecondary" textTransform="uppercase">
                Mapped Tests ({mappedTests.length})
              </Typography>

              {mappedTests.length > 0 ? (
                <List dense>
                  {mappedTests.map((t: any) => (
                    <ListItem key={t.id} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ScienceIcon color="secondary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t.name} secondary={t.path} />
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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Execution Manifest
      </Typography>

      {collection.collectionType === CollectionType.TESTS ? renderTestsFlat(collection.items) : renderTargetsNested(collection.items)}
    </Box>
  );
};
