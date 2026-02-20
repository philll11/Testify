import { useForm, Controller } from 'react-hook-form';
import {
    Grid,
    TextField,
    Button,
    Alert,
    Stack
} from '@mui/material';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { useAuth } from 'contexts/AuthContext';
import { useUpdateUser } from 'hooks/iam/useUsers';
import { gridSpacing } from 'store/constant';

const SecurityTab = () => {
    const { user } = useAuth();
    const { mutate: updateUser, isPending } = useUpdateUser();

    const { control, handleSubmit, watch, reset } = useForm({
        defaultValues: {
            password: '',
            confirmPassword: ''
        }
    });

    const onSubmit = (data: any) => {
        if (!user?.id) return;
        updateUser({
            id: user.id,
            data: {
                password: data.password,
            }
        }, {
            onSuccess: () => reset()
        });
    };

    const password = watch('password');

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <SubCard title="Change Password">
                <Grid container spacing={gridSpacing}>
                    <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Password must be at least 6 characters long.
                        </Alert>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Controller
                            name="password"
                            control={control}
                            rules={{
                                required: 'New Password is required',
                                minLength: { value: 6, message: 'Password must be at least 6 characters' }
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    type="password"
                                    label="New Password"
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Controller
                            name="confirmPassword"
                            control={control}
                            rules={{
                                required: 'Confirm Password is required',
                                validate: (val) => val === password || 'Passwords do not match'
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    type="password"
                                    label="Confirm New Password"
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Stack direction="row" justifyContent="flex-end">
                            <AnimateButton>
                                <Button variant="contained" type="submit" disabled={isPending}>
                                    Change Password
                                </Button>
                            </AnimateButton>
                        </Stack>
                    </Grid>
                </Grid>
            </SubCard>
        </form>
    );
};

export default SecurityTab;
