import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import ProfileForm from '../ProfileForm';
import { usePlatformProfile, useUpdatePlatformProfile } from 'hooks/platform/useProfiles';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { PlatformProfileFormData } from 'types/platform/profiles.schema';
import { UpdatePlatformProfileDto } from 'types/platform/profiles';

const ProfileEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/platform/profiles/${id}`);
    const { data: profile, isLoading, error } = usePlatformProfile(id!);
    const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdatePlatformProfile();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: PlatformProfileFormData) => {
        if (!profile) return;
        try {
            const dto: UpdatePlatformProfileDto = {
                name: values.name,
                description: values.description,
                config: values.config
            };
            await updateProfile({ id: profile.id, data: dto });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error('Failed to update profile', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!profile) return <MainCard title="Error">Profile not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading profile</MainCard>;

    return (
        <MainCard title={`Edit Profile: ${profile.name}`}>
            <ProfileForm
                mode="edit"
                profile={profile}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default ProfileEditPage;

