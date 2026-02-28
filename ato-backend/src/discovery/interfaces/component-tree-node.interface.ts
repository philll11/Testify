import { DiscoveredComponent } from '../entities/discovered-component.entity';

export interface ComponentTreeNode {
    id: string;
    name: string;
    nodeType: 'folder' | 'component';
    data?: DiscoveredComponent;
    children?: ComponentTreeNode[];
}
