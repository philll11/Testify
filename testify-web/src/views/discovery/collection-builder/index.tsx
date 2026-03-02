import { Grid, Divider } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { CollectionBuilderProvider } from './context/CollectionBuilderContext';
import { ComponentTreePane } from './components/ComponentTreePane';
import { CollectionDraftPane } from './components/CollectionDraftPane';

const CollectionBuilderPage = () => {
  return (
    <CollectionBuilderProvider>
      <MainCard
        title="Collection Builder"
        sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: 'calc(100vh - 130px)' }}
        contentSX={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, overflow: 'hidden' }}
      >
        <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0, height: '100%', mb: 0 }}>
          {/* Left Pane: Filter and Tree View */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ComponentTreePane />
          </Grid>

          {/* Vertical Divider for large screens */}
          <Grid size={{ xs: 12, md: 1 }} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
            <Divider orientation="vertical" />
          </Grid>

          {/* Right Pane: Collection Draft Pre-execution List */}
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CollectionDraftPane />
          </Grid>
        </Grid>
      </MainCard>
    </CollectionBuilderProvider>
  );
};

export default CollectionBuilderPage;
