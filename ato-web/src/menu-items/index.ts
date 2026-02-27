import dashboard from './dashboard';
import iam from './iam';
import platform from './platform';
import system from './system';
import { MenuItem } from './types';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: MenuItem = {
  items: [dashboard, platform, iam, system]
};

export default menuItems;
