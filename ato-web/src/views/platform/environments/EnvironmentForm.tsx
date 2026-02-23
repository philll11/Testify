import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    Select,
    Box,
    Typography,
    FormHelperText,
    Autocomplete,
    OutlinedInput,
    InputAdornment,
    IconButton
} from '@mui/material';
import { IconHistory, IconEye, IconEyeOff } from '@tabler/icons-react';

// Project Imports
import { PlatformEnvironment } from 'types/platform/environments';
import { platformEnvironmentSchema, PlatformEnvironmentFormData } from 'types/platform/environments.schema';
import { usePlatformProfiles } from 'hooks/platform/useProfiles';
import { usePlatformEnvironment } from 'hooks/platform/useEnvironments';

import { usePermission } from 'contexts/AuthContext';
import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';
import { IntegrationPlatform } from 'types/iam/credential.types';

export type EnvironmentFormMode = 'create' | 'edit' | 'view';

interface EnvironmentFormProps {
    mode: EnvironmentFormMode;
    environment?: PlatformEnvironment | null;
    initialValues?: Partial<PlatformEnvironmentFormData>;
    onSubmit: (values: any) => void;
    isLoading: boolean;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onValuesChange?: (values: Partial<PlatformEnvironmentFormData>) => void;
}

const EnvironmentForm = ({
    mode,
    environment,
    initialValues,
    onSubmit,
    isLoading,
    onCancel,
    onDirtyChange,
    onValuesChange
}: EnvironmentFormProps) => {
    const isEditing = mode === 'edit';
    const isCreating = mode === 'create';
    const isViewing = mode === 'view';

    const { can } = usePermission();

    // Fetch profiles for the dropdown
    const { data: profiles = [] } = usePlatformProfiles();

    // Fetch full environment details (including credentials) if we have an ID
    const { data: detailEnvironment, isLoading: isDetailLoading } = usePlatformEnvironment(environment?.id || '');

    const [showToken, setShowToken] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { isDirty, errors },
    } = useForm<PlatformEnvironmentFormData>({
        resolver: zodResolver(platformEnvironmentSchema),
        defaultValues: {
            name: '',
            description: '',
            profileId: '',
            credentials: {
                username: '',
                token: '',
                executionInstance: ''
            },
            ...initialValues,
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
            debounce((val: Partial<PlatformEnvironmentFormData>) => {
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
            debouncedOnValuesChange(value as Partial<PlatformEnvironmentFormData>);
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
        const effectiveEnv = detailEnvironment || environment;

        if (effectiveEnv && (isEditing || isViewing)) {
            reset({
                name: effectiveEnv.name,
                description: effectiveEnv.description || '',
                profileId: effectiveEnv.profile?.id || effectiveEnv.profileId || '',
                // Note: Credentials are typically masked or not returned fully. 
                // Assumption: Backend provides them or we accept empty on edit to mean "no change"
                credentials: {
                    username: '',
                    token: '',
                    executionInstance: '',
                    ...(effectiveEnv as any).credentials
                }
            });
        } else if (isCreating) {
            reset({
                name: initialValues?.name || '',
                description: initialValues?.description || '',
                profileId: initialValues?.profileId || '',
                credentials: {
                    username: '',
                    token: '',
                    executionInstance: '',
                    ...initialValues?.credentials
                },
                ...initialValues
            });
        }
    }, [environment, detailEnvironment, mode, isEditing, isViewing, isCreating, reset]);

    const handleFormSubmit = (values: PlatformEnvironmentFormData) => {
        onSubmit(values);
    };

    const handleClear = () => {
        reset({
            name: '',
            description: '',
            profileId: '',
            credentials: {
                username: '',
                token: '',
                executionInstance: ''
            },
        });
    };

    const isSubmitDisabled = isLoading || isDetailLoading || (!isDirty && !isCreating) || isViewing;

    // Define tabs
    const tabs = useMemo(() => [
        {
            label: 'Audit Trail',
            value: 'audit',
            icon: <IconHistory size="1.3rem" />,
            disabled: isCreating,
            component: (
                <Box sx={{ mt: 2 }}>
                    {environment?.id ? (
                        <ResourceAuditTable
                            resource="PlatformEnvironment"
                            resourceId={environment.id}
                        />
                    ) : (
                        <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
                    )}
                </Box>
            )
        }
    ], [isCreating, environment?.id]);


    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Environment Name"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                disabled={isViewing}
                            />
                        )}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                        name="profileId"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.profileId}>
                                <InputLabel id="profile-select-label">Profile</InputLabel>
                                <Select
                                    {...field}
                                    labelId="profile-select-label"
                                    label="Profile"
                                    disabled={isViewing}
                                >
                                    {profiles.map((profile) => (
                                        <MenuItem key={profile.id} value={profile.id}>
                                            {profile.name} ({profile.platformType})
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.profileId && (
                                    <FormHelperText>{errors.profileId.message}</FormHelperText>
                                )}
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
                    <Typography variant="h4" sx={{ mb: 2 }}>Credentials</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                        name="credentials.username"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Username"
                                fullWidth
                                error={!!errors.credentials?.username}
                                helperText={errors.credentials?.username?.message}
                                disabled={isViewing}
                            />
                        )}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                        name="credentials.token"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth variant="outlined" error={!!errors.credentials?.token}>
                                <InputLabel>Token / Password</InputLabel>
                                <OutlinedInput
                                    {...field}
                                    type={showToken ? 'text' : 'password'}
                                    disabled={isViewing}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowToken(!showToken)}
                                                onMouseDown={(e) => e.preventDefault()}
                                                edge="end"
                                            >
                                                {showToken ? <IconEye /> : <IconEyeOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    }
                                    label="Token / Password"
                                />
                                {errors.credentials?.token && (
                                    <FormHelperText>{errors.credentials?.token?.message}</FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                        name="credentials.executionInstance"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Execution Instance (Atom/Molecule)"
                                fullWidth
                                error={!!errors.credentials?.executionInstance}
                                helperText={errors.credentials?.executionInstance?.message}
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
                                    <Button
                                        variant="text"
                                        color="error"
                                        onClick={() => handleClear()}
                                    >
                                        Clear
                                    </Button>
                                ) : <Box />}

                                <Box display="flex" gap={2}>
                                    <Button variant="outlined" color="primary" onClick={onCancel} disabled={isLoading}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        disabled={isSubmitDisabled}
                                    >
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

export default EnvironmentForm;
