import { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import TestRegistryForm from '../components/TestRegistryForm';
import { useCreateTestRegistry } from 'hooks/test-registry/useTestRegistry';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { TestRegistryFormData } from 'types/test-registry/test-registry.schema';
import { CreateTestRegistryDto } from 'types/test-registry/test-registry.types';
import { useEnvironmentContext } from 'contexts/EnvironmentContext';
import { usePlatformEnvironments } from 'hooks/platform/useEnvironments';
import { useSnackbar } from 'contexts/SnackbarContext';

const TestRegistryCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/test-registry');
    const { mutateAsync: createMapping, isPending } = useCreateTestRegistry();
    const [isDirty, setIsDirty] = useState(false);

    const { activeEnvironmentId, triggerEnvironmentWarning } = useEnvironmentContext();
    const { data: environments } = usePlatformEnvironments();
    const { showMessage } = useSnackbar();

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: TestRegistryFormData) => {
        if (!activeEnvironmentId) {
            triggerEnvironmentWarning();
            showMessage('Please select an environment from the global dropdown before creating a mapping.', 'warning');
            return;
        }

        const activeEnv = environments?.find((e) => e.id === activeEnvironmentId);
        if (!activeEnv) {
            showMessage('Selected environment is invalid.', 'error');
            return;
        }

        try {
            const dto: CreateTestRegistryDto = {
                ...values,
                profileId: activeEnv.profileId,
                environmentId: activeEnvironmentId
            };
            const newMapping = await createMapping(dto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/test-registry/${newMapping.id}`), 0);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred';
            showMessage(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage, 'error');
            console.error(error);
        }
    };

    return (
        <MainCard title="Create Test Mapping">
            <TestRegistryForm mode="create" onSubmit={handleSubmit} isLoading={isPending} onCancel={goBack} onDirtyChange={setIsDirty} />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default TestRegistryCreatePage;
