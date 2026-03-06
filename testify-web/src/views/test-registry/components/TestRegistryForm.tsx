import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    TextField,
    Button,
    Grid,
    Box,
    Typography,
    FormControlLabel,
    Switch
} from '@mui/material';
import { IconHistory } from '@tabler/icons-react';

// Project Imports
import { TestRegistry } from 'types/test-registry/test-registry.types';
import { testRegistrySchema, TestRegistryFormData } from 'types/test-registry/test-registry.schema';

import { PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';
import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';

export type TestRegistryFormMode = 'create' | 'edit' | 'view';

interface TestRegistryFormProps {
    mode: TestRegistryFormMode;
    testRegistry?: TestRegistry | null;
    initialValues?: Partial<TestRegistryFormData>;
    onSubmit: (values: any) => void;
    isLoading: boolean;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onValuesChange?: (values: Partial<TestRegistryFormData>) => void;
}

const TestRegistryForm = ({
    mode,
    testRegistry,
    initialValues,
    onSubmit,
    isLoading,
    onCancel,
    onDirtyChange,
    onValuesChange
}: TestRegistryFormProps) => {
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
    } = useForm<TestRegistryFormData>({
        resolver: zodResolver(testRegistrySchema),
        defaultValues: {
            profileId: '',
            targetComponentId: '',
            targetComponentName: '',
            testComponentId: '',
            testComponentName: '',
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
            debounce((val: Partial<TestRegistryFormData>) => {
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
            debouncedOnValuesChange(value as Partial<TestRegistryFormData>);
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
        if (testRegistry && (isEditing || isViewing)) {
            reset({
                profileId: testRegistry.profileId || '',
                targetComponentId: testRegistry.targetComponentId,
                targetComponentName: testRegistry.targetComponentName || '',
                testComponentId: testRegistry.testComponentId,
                testComponentName: testRegistry.testComponentName || '',
                isActive: (testRegistry as any).isActive ?? true
            });
        } else if (isCreating) {
            reset({
                profileId: initialValues?.profileId || '',
                targetComponentId: initialValues?.targetComponentId || '',
                targetComponentName: initialValues?.targetComponentName || '',
                testComponentId: initialValues?.testComponentId || '',
                testComponentName: initialValues?.testComponentName || '',
                isActive: initialValues?.isActive ?? true,
                ...initialValues
            });
        }
    }, [testRegistry, mode, isEditing, isViewing, isCreating, reset]);

    const handleFormSubmit = (values: TestRegistryFormData) => {
        if (mode === 'create') {
            const { isActive, targetComponentName, testComponentName, profileId, ...createData } = values;
            onSubmit(createData);
        } else if (mode === 'edit') {
            onSubmit({
                ...values
            });
        }
    };

    const handleClear = () => {
        reset({
            profileId: initialValues?.profileId || '',
            targetComponentId: '',
            targetComponentName: '',
            testComponentId: '',
            testComponentName: '',
            isActive: true
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
                        {testRegistry?.id ? (
                            <ResourceAuditTable
                                resource="TestRegistry"
                                resourceId={testRegistry.id}
                                ignoredFields={[]}
                            />
                        ) : (
                            <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
                        )}
                    </Box>
                )
            }
        ],
        [testRegistry, isCreating]
    );

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <Grid container spacing={3} alignItems="center">
                {(!isCreating || watch('profileId')) && (
                    <Grid size={12}>
                        <Controller
                            name="profileId"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Profile ID"
                                    fullWidth
                                    disabled
                                />
                            )}
                        />
                    </Grid>
                )}

                <Grid size={5}>
                    <Controller
                        name="targetComponentId"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Target Component ID"
                                fullWidth
                                error={!!errors.targetComponentId}
                                helperText={errors.targetComponentId?.message}
                                disabled={isViewing || isLoading}
                            />
                        )}
                    />
                </Grid>

                <Grid size={2} display="flex" justifyContent="center">
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ whiteSpace: 'nowrap', fontWeight: 500, mt: errors.targetComponentId || errors.testComponentId ? -3 : 0 }}
                    >
                        is tested by
                    </Typography>
                </Grid>

                <Grid size={5}>
                    <Controller
                        name="testComponentId"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Test Component ID"
                                fullWidth
                                error={!!errors.testComponentId}
                                helperText={errors.testComponentId?.message}
                                disabled={isViewing || isLoading}
                            />
                        )}
                    />
                </Grid>

                {(!isCreating || watch('targetComponentName') || watch('testComponentName')) && (
                    <>
                        <Grid size={5}>
                            <Controller
                                name="targetComponentName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Target Component Name"
                                        fullWidth
                                        disabled
                                        slotProps={{
                                            input: {
                                                readOnly: true,
                                            },
                                        }}
                                        value={field.value || 'Pending...'}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid size={2}></Grid>

                        <Grid size={5}>
                            <Controller
                                name="testComponentName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Test Component Name"
                                        fullWidth
                                        disabled
                                        slotProps={{
                                            input: {
                                                readOnly: true,
                                            },
                                        }}
                                        value={field.value || 'Pending...'}
                                    />
                                )}
                            />
                        </Grid>
                    </>
                )}

                {!isCreating && can(PERMISSIONS.TEST_REGISTRY_MANAGE_INACTIVE) && (
                    <Grid size={12}>
                        <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="Active" disabled={isViewing || isLoading} />
                            )}
                        />
                    </Grid>
                )}
            </Grid>

            <Box sx={{ mt: 3 }}>
                <ResourceRelatedTabs tabs={tabs} />
            </Box>

            {!isViewing && (
                <Box sx={{ mt: 3, mb: 5 }}>
                    <Grid container>
                        <Grid size={12}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                {isCreating ? (
                                    <Button variant="text" color="error" onClick={() => handleClear()} disabled={isLoading}>
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
                                        {isLoading ? 'Saving...' : mode === 'edit' ? 'Update Mapping' : 'Create Mapping'}
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

export default TestRegistryForm;