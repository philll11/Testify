import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Grid, TextField, Button, Stack, FormHelperText } from '@mui/material';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { useAuth } from 'contexts/AuthContext';
import { useUpdateUser } from 'hooks/iam/useUsers';
import { gridSpacing } from 'store/constant';

const ProfileTab = () => {
  const { user } = useAuth();
  const { mutate: updateUser, isPending } = useUpdateUser();

  const { control, handleSubmit, reset, setError } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: ''
    }
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
    }
  }, [user, reset]);

  const onSubmit = (data: any) => {
    if (!user?.id) return;
    updateUser({
      id: user.id,
      data: {
        firstName: data.firstName,
        lastName: data.lastName
        // Email updates might require backend support or different flow
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SubCard title="Personal Information">
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="firstName"
              control={control}
              rules={{ required: 'First Name is required' }}
              render={({ field, fieldState: { error } }) => (
                <TextField {...field} fullWidth label="First Name" error={!!error} helperText={error?.message} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="lastName"
              control={control}
              rules={{ required: 'Last Name is required' }}
              render={({ field, fieldState: { error } }) => (
                <TextField {...field} fullWidth label="Last Name" error={!!error} helperText={error?.message} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Email Address" disabled helperText="Email cannot be changed directly." />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" justifyContent="flex-end">
              <AnimateButton>
                <Button variant="contained" type="submit" disabled={isPending}>
                  Save Changes
                </Button>
              </AnimateButton>
            </Stack>
          </Grid>
        </Grid>
      </SubCard>
    </form>
  );
};

export default ProfileTab;
