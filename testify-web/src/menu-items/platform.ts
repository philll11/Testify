// assets
import { IconApiApp, IconServer } from '@tabler/icons-react';
import { NavItem } from './types';
import { PERMISSIONS } from 'constants/permissions';

// constant
const icons = {
  IconApiApp,
  IconServer
};

// ==============================|| INTEGRATION PLATFORM MENU ITEMS ||============================== //

const platform: NavItem = {
  id: 'platform',
  title: 'Integration Platform',
  type: 'group',
  children: [
    {
      id: 'platform-profiles',
      title: 'Profiles',
      type: 'item',
      url: '/platform/profiles',
      icon: icons.IconApiApp,
      breadcrumbs: true,
      permission: PERMISSIONS.PLATFORM_PROFILE_VIEW
    },
    {
      id: 'platform-environments',
      title: 'Environments',
      type: 'item',
      url: '/platform/environments',
      icon: icons.IconServer,
      breadcrumbs: true,
      permission: PERMISSIONS.PLATFORM_ENVIRONMENT_VIEW
    }
  ]
};

export default platform;
