// assets
import { IconClipboardList } from '@tabler/icons-react';
import { NavItem } from './types';
import { PERMISSIONS } from 'constants/permissions';

// constant
const icons = {
  IconClipboardList
};

// ==============================|| OPERATIONS MENU ITEMS ||============================== //

const lists: NavItem = {
  id: 'operations',
  title: 'Operations',
  type: 'group',
  children: [
    {
      id: 'assessments',
      title: 'Assessments',
      type: 'item',
      url: '/assessments',
      icon: icons.IconClipboardList,
      breadcrumbs: true,
      permission: PERMISSIONS.ASSESSMENT_VIEW
    }
  ]
};

export default lists;
