import { Box, Stack, Typography, Switch, FormControlLabel, Divider } from '@mui/material';
import SubCard from 'ui-component/cards/SubCard';
import { useGetSystemConfig, useUpdateSystemConfig } from 'hooks/system/useConfig';
import { AuditConfig, SystemConfigKeys } from 'api/system/config';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

const GeneralSettingsTab = () => {
  const { can } = usePermission();
  const canEdit = can(PERMISSIONS.SYSTEM_CONFIG_EDIT);

  const { data: auditConfig, isLoading: isAuditLoading } = useGetSystemConfig<AuditConfig>(SystemConfigKeys.AUDIT);
  const { mutate: updateConfig, isPending: isUpdating } = useUpdateSystemConfig();

  const handleAuditToggle = (checked: boolean) => {
    if (!auditConfig) return;
    updateConfig({
      key: SystemConfigKeys.AUDIT,
      data: {
        value: {
          ...auditConfig.value,
          enabled: checked
        }
      }
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          General Configuration
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Manage global system behaviors and logging policies.
        </Typography>
      </Box>

      <Divider />

      <SubCard title="Audit Logging">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1">Enable Global Audit Trail</Typography>
            <Typography variant="caption" color="textSecondary">
              When enabled, all critical changes (Create, Update, Delete) to resources will be logged.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={auditConfig?.value?.enabled ?? false}
                onChange={(e) => handleAuditToggle(e.target.checked)}
                disabled={!canEdit || isUpdating || isAuditLoading}
                name="audit-toggle"
                color="primary"
              />
            }
            label={auditConfig?.value?.enabled ? 'On' : 'Off'}
          />
        </Stack>
      </SubCard>
    </Stack>
  );
};

export default GeneralSettingsTab;
