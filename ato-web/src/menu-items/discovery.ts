// assets
import { IconTelescope } from '@tabler/icons-react';
import { NavItem } from './types';
import { PERMISSIONS } from 'constants/permissions';

// constant
const icons = {
  IconTelescope
};

// ==============================|| DISCOVERY MENU ITEMS ||============================== //

const discovery: NavItem = {
  id: 'discovery',
  title: 'Discovery',
  type: 'group',
  children: [
    {
      id: 'test-suite-builder',
      title: 'Test Suite Builder',
      type: 'item',
      url: '/discovery/test-suite-builder',
      icon: icons.IconTelescope,
      breadcrumbs: true,
      permission: PERMISSIONS.DISCOVERY_VIEW
    }
  ]
};

export default discovery;
