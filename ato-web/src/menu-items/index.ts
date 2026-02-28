import dashboard from './dashboard';
import discovery from './discovery';
import iam from './iam';
import platform from './platform';
import system from './system';
import { MenuItem } from './types';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: MenuItem = {
  items: [dashboard, discovery, platform, iam, system]
};

export default menuItems;
