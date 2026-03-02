import React, { useEffect, useMemo, useRef } from 'react';
import { debounce, startCase, toLower } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  FormHelperText
} from '@mui/material';
import { IconHistory } from '@tabler/icons-react';

// Project Imports
import { PlatformProfile } from 'types/platform/profiles';
import { IntegrationPlatform } from 'types/platform/common';
import { platformProfileSchema, PlatformProfileFormData } from 'types/platform/profiles.schema';

import { usePermission } from 'contexts/AuthContext';
import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';

export type ProfileFormMode = 'create' | 'edit' | 'view';

interface ProfileFormProps {
  mode: ProfileFormMode;
  profile?: PlatformProfile | null;
  initialValues?: Partial<PlatformProfileFormData>;
  onSubmit: (values: PlatformProfileFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onValuesChange?: (values: Partial<PlatformProfileFormData>) => void;
}

const ProfileForm = ({ mode, profile, initialValues, onSubmit, isLoading, onCancel, onDirtyChange, onValuesChange }: ProfileFormProps) => {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors }
  } = useForm<PlatformProfileFormData>({
    resolver: zodResolver(platformProfileSchema),
    defaultValues: {
      name: '',
      accountId: '',
      description: '',
      platformType: IntegrationPlatform.BOOMI,
      config: {
        pollInterval: 5000,
        maxPolls: 12
      },
      ...initialValues
    }
  });

  // Keep a stable ref to the callback to avoid breaking debounce if prop changes referentially
  const onValuesChangeRef = useRef(onValuesChange);
  useEffect(() => {
    onValuesChangeRef.current = onValuesChange;
  }, [onValuesChange]);

  // Create a debounced version of the change handler
  const debouncedOnValuesChange = useMemo(
    () =>
      debounce((val: Partial<PlatformProfileFormData>) => {
        if (onValuesChangeRef.current) {
          onValuesChangeRef.current(val);
        }
      }, 500),
    []
  );

  // Watch for changes and notify parent
  useEffect(() => {
    if (!onValuesChange) return;
    const subscription = watch((value) => {
      debouncedOnValuesChange(value as Partial<PlatformProfileFormData>);
    });
    return () => {
      subscription.unsubscribe();
      debouncedOnValuesChange.cancel();
    };
  }, [watch, debouncedOnValuesChange, onValuesChange]);

  // Notify parent about dirty state
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // Initialize form with data
  useEffect(() => {
    if (profile && (isEditing || isViewing)) {
      reset({
        name: profile.name,
        accountId: profile.accountId,
        description: profile.description || '',
        platformType: profile.platformType,
        config: {
          pollInterval: profile.config?.pollInterval ?? 5000,
          maxPolls: profile.config?.maxPolls ?? 12
        }
      });
    } else if (isCreating) {
      reset({
        accountId: initialValues?.accountId || '',
        name: initialValues?.name || '',
        description: initialValues?.description || '',
        platformType: initialValues?.platformType || IntegrationPlatform.BOOMI,
        config: initialValues?.config || {
          pollInterval: 5000,
          maxPolls: 12
        },
        ...initialValues
      });
    }
  }, [profile, mode, isEditing, isViewing, isCreating, reset]);

  const handleFormSubmit = (values: PlatformProfileFormData) => {
    onSubmit(values);
  };

  const handleClear = () => {
    reset({
      accountId: '',
      name: '',
      description: '',
      platformType: IntegrationPlatform.BOOMI,
      config: {
        pollInterval: 5000,
        maxPolls: 12
      }
    });
  };

  const isSubmitDisabled = isLoading || (!isDirty && !isCreating) || isViewing;

  // Define tabs
  const tabs = useMemo(
    () => [
      {
        label: 'Audit Trail',
        value: 'audit',
        icon: <IconHistory size="1.3rem" />,
        disabled: isCreating,
        component: (
          <Box sx={{ mt: 2 }}>
            {/* Placeholder for Audit Trail - assumes implementation similar to UserForm */}
            {profile?.id ? (
              <ResourceAuditTable
                resource="PlatformProfile"
                resourceId={profile.id}
                ignoredFields={['updatedAt', 'createdAt']} // Example ignored fields
              />
            ) : (
              <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
            )}
          </Box>
        )
      }
    ],
    [isCreating, profile?.id]
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Profile Name"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Account ID"
                fullWidth
                error={!!errors.accountId}
                helperText={errors.accountId?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="platformType"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.platformType}>
                <InputLabel id="platform-type-label">Platform Type</InputLabel>
                <Select {...field} labelId="platform-type-label" label="Platform Type" disabled={isViewing || isEditing}>
                  {Object.values(IntegrationPlatform).map((platform) => (
                    <MenuItem key={platform} value={platform}>
                      {startCase(toLower(platform))}
                    </MenuItem>
                  ))}
                </Select>
                {errors.platformType && <FormHelperText>{errors.platformType.message}</FormHelperText>}
              </FormControl>
            )}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description"
                fullWidth
                multiline
                rows={3}
                error={!!errors.description}
                helperText={errors.description?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Configuration
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="config.pollInterval"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Poll Interval (ms)"
                type="number"
                fullWidth
                error={!!errors.config?.pollInterval}
                helperText={errors.config?.pollInterval?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="config.maxPolls"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Max Polls"
                type="number"
                fullWidth
                error={!!errors.config?.maxPolls}
                helperText={errors.config?.maxPolls?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <ResourceRelatedTabs tabs={tabs} />
      </Box>

      {/* Buttons (Hidden in View mode if strictly viewing, or you might want an Edit button) */}
      {!isViewing && (
        <Box sx={{ mt: 3, mb: 5 }}>
          <Grid container>
            <Grid size={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                {isCreating ? (
                  <Button variant="text" color="error" onClick={() => handleClear()}>
                    Clear
                  </Button>
                ) : (
                  <Box />
                )}

                <Box display="flex" gap={2}>
                  <Button variant="outlined" color="primary" onClick={onCancel} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary" disabled={isSubmitDisabled}>
                    {isEditing ? 'Update Profile' : 'Create Profile'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
    </form>
  );
};

export default ProfileForm;
