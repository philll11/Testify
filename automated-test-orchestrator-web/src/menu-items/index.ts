import dashboard from './dashboard';
import iam from './iam';
import system from './system';
import { MenuItem } from './types';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: MenuItem = {
  items: [dashboard, iam, system]
};

export default menuItems;
