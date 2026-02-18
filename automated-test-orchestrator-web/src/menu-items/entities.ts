// assets
import { IconBuildingCommunity, IconTrees, IconTree } from '@tabler/icons-react';
import { NavItem } from './types';
import { PERMISSIONS } from 'constants/permissions';

// constant
const icons = {
    IconBuildingCommunity,
    IconTrees,
    IconTree
};

// ==============================|| ENTITIES MENU ITEMS ||============================== //

const entities: NavItem = {
    id: 'entities',
    title: 'Management',
    type: 'group',
    children: [
        {
            id: 'clients',
            title: 'Clients',
            type: 'item',
            url: '/clients',
            icon: icons.IconBuildingCommunity,
            breadcrumbs: true,
            permission: PERMISSIONS.CLIENT_VIEW
        },
        {
            id: 'orchards',
            title: 'Orchards',
            type: 'item',
            url: '/orchards',
            icon: icons.IconTrees,
            breadcrumbs: true,
            permission: PERMISSIONS.ORCHARD_VIEW
        },
        {
            id: 'blocks',
            title: 'Blocks',
            type: 'item',
            url: '/blocks',
            icon: icons.IconTree,
            breadcrumbs: true,
            permission: PERMISSIONS.BLOCK_VIEW
        }

    ]
};

export default entities;