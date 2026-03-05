import { useQuery } from '@tanstack/react-query';
import { getTestResults } from '../../api/test-results/test-results';
import { TestResultQuery } from '../../types/test-results/test-result.types';
import { usePermission } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../constants/permissions';

export const TEST_RESULTS_KEYS = {
    all: ['test-results'] as const,
    list: (query?: TestResultQuery) => [...TEST_RESULTS_KEYS.all, query] as const,
};

export const useGetTestResults = (query?: TestResultQuery, options?: { enabled?: boolean; refetchInterval?: number | ((data: any) => number | false) }) => {
    const { can } = usePermission();
    const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.COLLECTION_VIEW);

    return useQuery({
        queryKey: TEST_RESULTS_KEYS.list(query),
        queryFn: () => getTestResults(query),
        enabled: isEnabled,
        refetchInterval: options?.refetchInterval,
    });
};
