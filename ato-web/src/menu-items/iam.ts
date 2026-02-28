// assets
import { IconUsers, IconSettings2, IconBuildingCommunity } from '@tabler/icons-react';
import { NavItem } from './types';
import { PERMISSIONS } from 'constants/permissions';

// constant
const icons = {
  IconUsers,
  IconSettings2,
  IconBuildingCommunity
};

// ==============================|| IAM MENU ITEMS ||============================== //

const iam: NavItem = {
  id: 'iam',
  title: 'Identity Access',
  type: 'group',
  children: [
    {
      id: 'users',
      title: 'Users',
      type: 'item',
      url: '/users',
      icon: icons.IconUsers,
      breadcrumbs: true,
      permission: PERMISSIONS.USER_VIEW
    },
    {
      id: 'roles',
      title: 'Roles',
      type: 'item',
      url: '/roles',
      icon: icons.IconSettings2,
      breadcrumbs: true,
      permission: PERMISSIONS.ROLE_VIEW
    }
  ]
};

export default iam;
