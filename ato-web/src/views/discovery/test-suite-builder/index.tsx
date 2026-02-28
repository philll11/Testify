import { Grid, Divider } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { TestSuiteBuilderProvider } from './context/TestSuiteBuilderContext';
import { ComponentTreePane } from './components/ComponentTreePane';
import { ManifestPane } from './components/ManifestPane';

const TestSuiteBuilderPage = () => {
  return (
    <TestSuiteBuilderProvider>
      <MainCard title="Test Suite Builder">
        <Grid container spacing={2}>
          {/* Left Pane: Filter and Tree View */}
          <Grid size={{ xs: 12, md: 5 }}>
            <ComponentTreePane />
          </Grid>

          {/* Vertical Divider for large screens */}
          <Grid size={{ xs: 12, md: 1 }} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
            <Divider orientation="vertical" />
          </Grid>

          {/* Right Pane: Manifest Selection List */}
          <Grid size={{ xs: 12, md: 6 }}>
            <ManifestPane />
          </Grid>
        </Grid>
      </MainCard>
    </TestSuiteBuilderProvider>
  );
};

export default TestSuiteBuilderPage;
