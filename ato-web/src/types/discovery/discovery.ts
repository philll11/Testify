export interface ComponentTreeNode {
  id: string; // The folder path or component ID
  name: string; // The display name
  nodeType: 'folder' | 'component'; // Indicates if this node is a folder or a leaf component
  data?: any; // The underlying component details (only present if nodeType is 'component')
  children?: ComponentTreeNode[]; // Child nodes (folders or components)
}

export interface GetDiscoveryComponentsDto {
  profileId?: string;
  isTest?: boolean;
  search?: string;
}
