import { useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import TestRegistryForm from '../components/TestRegistryForm';
import { useCreateTestRegistry } from 'hooks/test-registry/useTestRegistry';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { TestRegistryFormData } from 'types/test-registry/test-registry.schema';
import { CreateTestRegistryDto } from 'types/test-registry/test-registry.types';

const TestRegistryCreatePage = () => {
    const { goBack, transitionTo } = useContextualNavigation('/test-registry');
    const { mutateAsync: createMapping, isPending } = useCreateTestRegistry();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: TestRegistryFormData) => {
        try {
            const newMapping = await createMapping(values as CreateTestRegistryDto);
            setIsDirty(false);
            setTimeout(() => transitionTo(`/test-registry/${newMapping.id}`), 0);
        } catch (error) {
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
