import React, { MouseEvent, useEffect, useMemo, useState, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Box,
  Checkbox,
  InputAdornment,
  IconButton,
  OutlinedInput,
  FormHelperText,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material';
import { IconEye, IconEyeOff, IconHistory, IconLock } from '@tabler/icons-react';

// Project Imports
import { User } from 'types/iam/user.types';
import { userSchema, UserFormData } from 'types/iam/user.schema';

import { PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';
import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';

import { useGetRoles } from 'hooks/iam/useRoles';

export type UserFormMode = 'create' | 'edit' | 'view';

interface UserFormProps {
  mode: UserFormMode;
  user?: User | null;
  initialValues?: Partial<UserFormData>;
  onSubmit: (values: any) => void;
  isLoading: boolean;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onValuesChange?: (values: Partial<UserFormData>) => void;
}

const UserForm = ({ mode, user, initialValues, onSubmit, isLoading, onCancel, onDirtyChange, onValuesChange }: UserFormProps) => {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission();

  const [showPassword, setShowPassword] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);

  // Data Fetching
  const { data: roles = [] } = useGetRoles();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, errors }
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      roleId: '',
      password: '',
      isActive: true,
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
      debounce((val: Partial<UserFormData>) => {
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
      debouncedOnValuesChange(value as Partial<UserFormData>);
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
    if (user && (isEditing || isViewing)) {
      // Normalize populated fields to IDs for the form

      const normalizedRoleId =
        (user as any).role?.id || (typeof user.roleId === 'object' && user.roleId !== null ? (user.roleId as any).id : user.roleId);

      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roleId: normalizedRoleId,
        isActive: user.isActive
      });
    } else if (isCreating) {
      reset({
        firstName: initialValues?.firstName || '',
        lastName: initialValues?.lastName || '',
        email: initialValues?.email || '',
        roleId: initialValues?.roleId || '',
        isActive: true,
        ...initialValues
      });
    }
  }, [user, mode, isEditing, isViewing, isCreating, reset]);

  const handleFormSubmit = (values: UserFormData) => {
    if (mode === 'create') {
      const { isActive, ...createData } = values;
      onSubmit(createData);
    } else if (mode === 'edit') {
      onSubmit({
        ...values
      });
    }
  };

  const handleClear = () => {
    reset({
      firstName: '',
      lastName: '',
      email: '',
      roleId: undefined,
      password: ''
    });
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: MouseEvent) => {
    event.preventDefault();
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
            {user?.id ? (
              <ResourceAuditTable
                resource="User"
                resourceId={user.id}
                ignoredFields={['name', 'passwordResetToken', 'passwordResetExpires', 'roleId', 'preferences', 'tokenVersion']}
              />
            ) : (
              <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
            )}
          </Box>
        )
      }
    ],
    [user, isCreating]
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="First Name"
                fullWidth
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>
        <Grid size={12}>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Last Name"
                fullWidth
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                disabled={isViewing}
              />
            )}
          />
        </Grid>
        <Grid size={12}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email Address"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isViewing}
                autoComplete="username"
              />
            )}
          />
        </Grid>

        <Grid size={12}>
          <Controller
            name="roleId"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Autocomplete
                {...field}
                options={roles}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                value={roles.find((r) => r.id === value) || null}
                onChange={(_, newValue) => {
                  onChange(newValue ? newValue.id : '');
                }}
                disabled={isViewing}
                renderInput={(params) => <TextField {...params} label="Role" error={!!errors.roleId} helperText={errors.roleId?.message} />}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            )}
          />
        </Grid>

        {/* Password Section */}
        <Grid size={12}>
          {isEditing && !changePasswordMode ? (
            <Button variant="outlined" startIcon={<IconLock />} onClick={() => setChangePasswordMode(true)} disabled={isViewing}>
              Change Password
            </Button>
          ) : (
            <FormControl fullWidth variant="outlined" error={!!errors.password}>
              <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <OutlinedInput
                    {...field}
                    id="outlined-adornment-password"
                    type={showPassword ? 'text' : 'password'}
                    disabled={isViewing}
                    autoComplete="new-password"
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <IconEye /> : <IconEyeOff />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label="Password"
                  />
                )}
              />
              {errors.password && <FormHelperText error>{errors.password.message}</FormHelperText>}
              {changePasswordMode && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setValue('password', '');
                      setChangePasswordMode(false);
                    }}
                  >
                    Cancel Change
                  </Button>
                </Box>
              )}
            </FormControl>
          )}
        </Grid>
        {!isCreating && can(PERMISSIONS.USER_MANAGE_INACTIVE) && (
          <Grid size={12}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Active" disabled={isViewing} />
              )}
            />
          </Grid>
        )}
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
                    {isEditing ? 'Update User' : 'Create User'}
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

export default UserForm;
