import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import EnvironmentForm from '../EnvironmentForm';
import { usePlatformEnvironment, useUpdatePlatformEnvironment } from 'hooks/platform/useEnvironments';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { PlatformEnvironmentFormData } from 'types/platform/environments.schema';
import { UpdatePlatformEnvironmentDto } from 'types/platform/environments';

const EnvironmentEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/platform/environments/${id}`);
    const { data: environment, isLoading, error } = usePlatformEnvironment(id!);
    const { mutateAsync: updateEnvironment, isPending: isUpdating } = useUpdatePlatformEnvironment();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: PlatformEnvironmentFormData) => {
        if (!environment) return;
        try {
            const dto: UpdatePlatformEnvironmentDto = {
                name: values.name,
                description: values.description,
                profileId: values.profileId,
                credentials: values.credentials // We send full credentials object if updated
            };
            await updateEnvironment({ id: environment.id, data: dto });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error('Failed to update environment', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!environment) return <MainCard title="Error">Environment not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading environment</MainCard>;

    return (
        <MainCard title={`Edit Environment: ${environment.name}`}>
            <EnvironmentForm
                mode="edit"
                initialValues={environment as any} // Cast because backend entity differs slightly from form schema (e.g. credentials hidden)
                // Actually EnvironmentForm handles fetching profile details? No, it expects initialValues.
                // Wait, EnvironmentForm expects initialValues of type Partial<PlatformEnvironmentFormData>.
                // The environment object from API might not have credentials exposed.
                // If credentials are not returned, the form fields will be empty.
                // The user re-enters credentials if they want to update them.
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default EnvironmentEditPage;

