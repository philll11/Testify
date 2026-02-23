import React, { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import ProfileForm from '../ProfileForm';
import { useCreatePlatformProfile } from 'hooks/platform/useProfiles';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { PlatformProfileFormData } from 'types/platform/profiles.schema';
import { CreatePlatformProfileDto } from 'types/platform/profiles';

const ProfileCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/platform/profiles');
    const { mutateAsync: createProfile, isPending } = useCreatePlatformProfile();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: PlatformProfileFormData) => {
        try {
            const dto: CreatePlatformProfileDto = {
                name: values.name,
                accountId: values.accountId,
                description: values.description,
                platformType: values.platformType,
                isDefault: values.isDefault,
                config: values.config
            };
            const newProfile = await createProfile(dto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/platform/profiles/${newProfile.id}`), 0);
        } catch (error) {
            console.error('Failed to create profile', error);
        }
    };

    return (
        <MainCard title="Create Platform Profile">
            <ProfileForm
                mode="create"
                onSubmit={handleSubmit}
                isLoading={isPending}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default ProfileCreatePage;

