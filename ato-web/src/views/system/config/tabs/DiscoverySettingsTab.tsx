import { useState, useEffect } from 'react';
import { Box, Stack, Typography, Divider, TextField, Button, Chip, Autocomplete, FormControlLabel, Switch } from '@mui/material';
import SubCard from 'ui-component/cards/SubCard';
import { useGetSystemConfig, useUpdateSystemConfig } from 'hooks/system/useConfig';
import { DiscoveryConfig, SystemConfigKeys } from 'api/system/config';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { usePlatformEnvironments } from 'hooks/platform/useEnvironments';
import { BOOMI_COMPONENT_TYPES, BOOMI_COMPONENT_LABELS } from 'constants/boomi';

const SCHEDULE_OPTIONS = [
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 4 hours', value: '0 */4 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0' }
];

const DiscoverySettingsTab = () => {
  const { can } = usePermission();
  const canEdit = can(PERMISSIONS.SYSTEM_CONFIG_EDIT);

  const { data: discoveryConfig, isLoading: isDiscoveryLoading } = useGetSystemConfig<DiscoveryConfig>(SystemConfigKeys.DISCOVERY);
  const { data: environments } = usePlatformEnvironments();
  const { mutate: updateConfig, isPending: isUpdating } = useUpdateSystemConfig();

  const [localDiscoveryConfig, setLocalDiscoveryConfig] = useState<DiscoveryConfig>({
    componentTypes: [],
    testDirectoryFolderName: '',
    defaultSyncEnvironmentId: '',
    syncScheduleCron: '',
    isSyncActive: false
  });

  useEffect(() => {
    if (discoveryConfig?.value) {
      setLocalDiscoveryConfig({
        componentTypes: discoveryConfig.value.componentTypes || [],
        testDirectoryFolderName: discoveryConfig.value.testDirectoryFolderName || '',
        defaultSyncEnvironmentId: discoveryConfig.value.defaultSyncEnvironmentId || '',
        syncScheduleCron: discoveryConfig.value.syncScheduleCron || '',
        isSyncActive: discoveryConfig.value.isSyncActive || false
      });
    }
  }, [discoveryConfig]);

  const handleDiscoveryConfigChange = (field: keyof DiscoveryConfig, value: any) => {
    setLocalDiscoveryConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDiscoveryConfig = () => {
    updateConfig({
      key: SystemConfigKeys.DISCOVERY,
      data: {
        value: {
          ...localDiscoveryConfig,
          testDirectoryFolderName: localDiscoveryConfig.testDirectoryFolderName || null,
          defaultSyncEnvironmentId: localDiscoveryConfig.defaultSyncEnvironmentId || null
        }
      }
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Discovery & Synchronization Engine
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Configure the background worker that synchronizes integration components into the local cache.
        </Typography>
      </Box>

      <Divider />

      <SubCard title="Engine Configuration">
        <Stack spacing={3}>
          <FormControlLabel
            control={
              <Switch
                checked={localDiscoveryConfig.isSyncActive || false}
                onChange={(e) => handleDiscoveryConfigChange('isSyncActive', e.target.checked)}
                disabled={!canEdit || isUpdating || isDiscoveryLoading}
                color="primary"
              />
            }
            label="Enable Background Sync"
          />

          <Autocomplete
            multiple
            id="component-types-autocomplete"
            options={BOOMI_COMPONENT_TYPES}
            getOptionLabel={(option) => BOOMI_COMPONENT_LABELS[option] || option}
            disableCloseOnSelect
            value={localDiscoveryConfig.componentTypes}
            onChange={(_, newValue) => handleDiscoveryConfigChange('componentTypes', newValue)}
            disabled={!canEdit || isUpdating || isDiscoveryLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Component Types to Sync"
                helperText="Select which component types should be fetched from the integration platform."
              />
            )}
            renderValue={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} variant="outlined" label={BOOMI_COMPONENT_LABELS[option] || option} size="small" {...tagProps} />;
              })
            }
          />

          <TextField
            fullWidth
            label="Test Directory Folder Name"
            value={localDiscoveryConfig.testDirectoryFolderName}
            onChange={(e) => handleDiscoveryConfigChange('testDirectoryFolderName', e.target.value)}
            disabled={!canEdit || isUpdating || isDiscoveryLoading}
            helperText="The name of the folder that contains executable test processes (e.g., 'testFolder'). Leave blank if not applicable."
          />

          <Autocomplete
            id="default-env-autocomplete"
            options={environments || []}
            getOptionLabel={(option) => option.name}
            value={environments?.find((env) => env.id === localDiscoveryConfig.defaultSyncEnvironmentId) || null}
            onChange={(_, newValue) => handleDiscoveryConfigChange('defaultSyncEnvironmentId', newValue ? newValue.id : '')}
            disabled={!canEdit || isUpdating || isDiscoveryLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Default Sync Environment"
                helperText="The environment credentials used by the background worker to connect to the integration platform."
              />
            )}
          />

          <Autocomplete
            freeSolo
            id="sync-schedule-autocomplete"
            options={SCHEDULE_OPTIONS}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return option.label;
            }}
            value={
              SCHEDULE_OPTIONS.find((opt) => opt.value === localDiscoveryConfig.syncScheduleCron) ||
              localDiscoveryConfig.syncScheduleCron ||
              null
            }
            onChange={(_, newValue) => {
              if (typeof newValue === 'string') {
                handleDiscoveryConfigChange('syncScheduleCron', newValue);
              } else if (newValue && newValue.value) {
                handleDiscoveryConfigChange('syncScheduleCron', newValue.value);
              } else {
                handleDiscoveryConfigChange('syncScheduleCron', '');
              }
            }}
            disabled={!canEdit || isUpdating || isDiscoveryLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Sync Schedule"
                helperText="Select a schedule or type a custom cron expression (e.g., '0 */4 * * *')."
              />
            )}
          />

          {canEdit && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="contained" color="primary" onClick={handleSaveDiscoveryConfig} disabled={isUpdating || isDiscoveryLoading}>
                Save Configuration
              </Button>
            </Box>
          )}
        </Stack>
      </SubCard>
    </Stack>
  );
};

export default DiscoverySettingsTab;
