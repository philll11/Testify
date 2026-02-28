import { FC, createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ComponentTreeNode } from 'types/discovery/discovery';

export interface TestSuiteBuilderState {
  profileId: string | undefined;
  setProfileId: (id: string | undefined) => void;

  isTestMode: boolean;
  setIsTestMode: (isTest: boolean) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Track the set of selected IDs in the tree (folders or test nodes)
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;

  // Right-pane manifest details (the flat array of execution scripts to be generated)
  manifestList: ComponentTreeNode[];
  setManifestList: (list: ComponentTreeNode[]) => void;

  // Add logic to toggle node selection (checkbox behavior)
  toggleNodeSelection: (id: string, isSelected: boolean) => void;
}

const TestSuiteBuilderContext = createContext<TestSuiteBuilderState | undefined>(undefined);

const PROFILE_ID_CACHE_KEY = 'ato-test-suite-builder-profile-id';

export const TestSuiteBuilderProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [profileId, setProfileId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(PROFILE_ID_CACHE_KEY) || undefined;
    }
    return undefined;
  });
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [manifestList, setManifestList] = useState<ComponentTreeNode[]>([]);

  // Persist selected profile ID across sessions
  useEffect(() => {
    if (profileId) {
      localStorage.setItem(PROFILE_ID_CACHE_KEY, profileId);
    } else {
      localStorage.removeItem(PROFILE_ID_CACHE_KEY);
    }
  }, [profileId]);

  const toggleNodeSelection = (id: string, isSelected: boolean) => {
    setSelectedNodeIds((prev) => (isSelected ? [...prev, id] : prev.filter((existingId) => existingId !== id)));
  };

  const value = useMemo(
    () => ({
      profileId,
      setProfileId,
      isTestMode,
      setIsTestMode,
      searchQuery,
      setSearchQuery,
      selectedNodeIds,
      setSelectedNodeIds,
      manifestList,
      setManifestList,
      toggleNodeSelection
    }),
    [profileId, isTestMode, searchQuery, selectedNodeIds, manifestList]
  );

  return <TestSuiteBuilderContext.Provider value={value}>{children}</TestSuiteBuilderContext.Provider>;
};

export const useTestSuiteBuilderContext = (): TestSuiteBuilderState => {
  const context = useContext(TestSuiteBuilderContext);
  if (!context) {
    throw new Error('useTestSuiteBuilderContext must be used within a TestSuiteBuilderProvider');
  }
  return context;
};
