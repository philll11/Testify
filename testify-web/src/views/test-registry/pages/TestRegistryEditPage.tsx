import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import TestRegistryForm from '../components/TestRegistryForm';
import { useGetTestRegistry, useUpdateTestRegistry } from 'hooks/test-registry/useTestRegistry';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { TestRegistryFormData } from 'types/test-registry/test-registry.schema';
import { Typography } from '@mui/material';

const TestRegistryEditPage = () => {
    const { id } = useParams();
    const { goBack } = useContextualNavigation(`/test-registry/${id}`);
    const { data: mapping, isLoading, error } = useGetTestRegistry(id!);
    const { mutateAsync: updateMapping, isPending: isUpdating } = useUpdateTestRegistry();
    const [isDirty, setIsDirty] = useState(false);

    const { discardDialogProps } = useDiscardWarning(isDirty);

    const handleSubmit = async (values: TestRegistryFormData) => {
        if (!mapping) return;
        try {
            await updateMapping({ id: mapping.id, data: { ...values } });
            setIsDirty(false);
            setTimeout(() => goBack(), 0);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!mapping) return <MainCard title="Error">Test mapping not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading test mapping</MainCard>;

    return (
        <MainCard title="Edit Test Mapping">
            <TestRegistryForm
                mode="edit"
                testRegistry={mapping}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                onCancel={() => goBack()}
                onDirtyChange={setIsDirty}
            />
            <ConfirmDialog {...discardDialogProps} />
        </MainCard>
    );
};

export default TestRegistryEditPage;
