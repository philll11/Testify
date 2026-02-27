import React, { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import EnvironmentForm from '../EnvironmentForm';
import { useCreatePlatformEnvironment } from 'hooks/platform/useEnvironments';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { PlatformEnvironmentFormData } from 'types/platform/environments.schema';
import { CreatePlatformEnvironmentDto } from 'types/platform/environments';

const EnvironmentCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/platform/environments');
    const { mutateAsync: createEnvironment, isPending } = useCreatePlatformEnvironment();
    const [isDirty, setIsDirty] = useState(false);

    // Prompt before leaving if dirty
    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: PlatformEnvironmentFormData) => {
        try {
            const dto: CreatePlatformEnvironmentDto = {
                name: values.name,
                description: values.description,
                profileId: values.profileId,
                isDefault: values.isDefault,
                credentials: values.credentials
            };
            const newEnv = await createEnvironment(dto);
            setIsDirty(false);
            // Navigate to view page or list
            // Assuming view page exists at /platform/environments/:id
            setTimeout(() => transitionTo(`/platform/environments/${newEnv.id}`), 0);
        } catch (error) {
            console.error('Failed to create environment', error);
        }
    };

    return (
        <MainCard title="Create Platform Environment">
            <EnvironmentForm
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

export default EnvironmentCreatePage;
