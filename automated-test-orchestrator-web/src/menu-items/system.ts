// assets
import { IconSettings, IconDeviceAnalytics } from '@tabler/icons-react';
import { NavItem } from './types';
import { PERMISSIONS } from 'constants/permissions';

// constant
const icons = { IconSettings, IconDeviceAnalytics };

// ==============================|| SYSTEM MENU ITEMS ||============================== //

const system: NavItem = {
  id: 'system',
  title: 'System',
  type: 'group',
  children: [
    {
      id: 'settings',
      title: 'Settings',
      type: 'item',
      url: '/system/settings',
      icon: icons.IconSettings,
      breadcrumbs: false,
      permission: PERMISSIONS.SYSTEM_CONFIG_VIEW
    }
  ]
};

export default system;
