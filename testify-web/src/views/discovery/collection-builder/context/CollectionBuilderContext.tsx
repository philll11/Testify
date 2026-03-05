import { FC, createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ComponentTreeNode } from 'types/discovery/discovery';

export interface CollectionBuilderState {
  isTestMode: boolean;
  setIsTestMode: (isTest: boolean) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Track the set of selected IDs in the tree (folders or test nodes)
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;

  // Right-pane selection details (the flat array of execution scripts to be generated)
  selectedItems: ComponentTreeNode[];
  setSelectedItems: (list: ComponentTreeNode[]) => void;

  collectionType: 'TARGETS' | 'TESTS';
  setCollectionType: (type: 'TARGETS' | 'TESTS') => void;

  // Add logic to toggle node selection (checkbox behavior)
  toggleNodeSelection: (id: string, isSelected: boolean) => void;
}

const CollectionBuilderContext = createContext<CollectionBuilderState | undefined>(undefined);

export const CollectionBuilderProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [collectionType, setCollectionType] = useState<'TARGETS' | 'TESTS'>('TARGETS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<ComponentTreeNode[]>([]);

  const toggleNodeSelection = (id: string, isSelected: boolean) => {
    setSelectedNodeIds((prev) => (isSelected ? [...prev, id] : prev.filter((existingId) => existingId !== id)));
  };

  const value = useMemo(
    () => ({
      isTestMode,
      setIsTestMode,
      searchQuery,
      setSearchQuery,
      selectedNodeIds,
      setSelectedNodeIds,
      selectedItems,
      setSelectedItems,
      collectionType,
      setCollectionType,
      toggleNodeSelection
    }),
    [isTestMode, searchQuery, selectedNodeIds, selectedItems, collectionType]
  );

  return <CollectionBuilderContext.Provider value={value}>{children}</CollectionBuilderContext.Provider>;
};

export const useCollectionBuilderContext = (): CollectionBuilderState => {
  const context = useContext(CollectionBuilderContext);
  if (!context) {
    throw new Error('useCollectionBuilderContext must be used within a CollectionBuilderProvider');
  }
  return context;
};
