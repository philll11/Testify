// assets
import { IconSettingsSpark } from '@tabler/icons-react';
import { NavItem } from './types';
import { PERMISSIONS } from 'constants/permissions';

// constant
const icons = {
  IconSettingsSpark
};

// ==============================|| LISTS MENU ITEMS ||============================== //

const lists: NavItem = {
  id: 'lists',
  title: 'Lists',
  type: 'group',
  children: [
    {
      id: 'varieties',
      title: 'Varieties',
      type: 'item',
      url: '/varieties',
      icon: icons.IconSettingsSpark,
      breadcrumbs: true,
      permission: PERMISSIONS.VARIETY_VIEW
    }
  ]
};

export default lists;
