import { Activity, memo, useState, useMemo } from 'react';

// material-ui
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import NavItem from './NavItem';
import NavGroup from './NavGroup';
import menuItems from 'menu-items';

import { useMenu } from 'contexts/MenuContext';
import { NavItem as NavItemModel } from 'menu-items/types';
import { usePermission } from 'contexts/AuthContext';

// ==============================|| SIDEBAR MENU LIST ||============================== //

function MenuList() {
  const { isDashboardDrawerOpened } = useMenu();
  const drawerOpen = isDashboardDrawerOpened;
  const { can } = usePermission();

  const [selectedID, setSelectedID] = useState<string | undefined>('');

  const filterByPermission = (items: NavItemModel[]): NavItemModel[] => {
    return items.reduce((acc: NavItemModel[], item: NavItemModel) => {
      if (item.permission && !can(item.permission)) {
        return acc;
      }

      if (item.children) {
        const children = filterByPermission(item.children);

        if (children.length === 0 && (item.type === 'group' || item.type === 'collapse')) {
          return acc;
        }
        return [...acc, { ...item, children }];
      }

      return [...acc, item];
    }, []);
  };

  const filteredItems = useMemo(() => filterByPermission(menuItems.items), [can]);

  const lastItem: number | null = null;

  let lastItemIndex = filteredItems.length - 1;
  let remItems: any[] = [];
  let lastItemId: string | undefined;

  if (lastItem !== null && lastItem < filteredItems.length) {
    lastItemId = filteredItems[lastItem - 1].id;
    lastItemIndex = lastItem - 1;
    remItems = filteredItems.slice(lastItem - 1, filteredItems.length).map((item) => ({
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(item.url && {
        url: item.url
      })
    }));
  }

  const navItems = filteredItems.slice(0, lastItemIndex + 1).map((item: NavItemModel, index: number) => {
    switch (item.type) {
      case 'group':
        if (item.url && item.id !== lastItemId) {
          return (
            <List key={item.id}>
              <NavItem item={item} level={1} isParents setSelectedID={() => setSelectedID('')} />
              <Activity mode={index !== 0 ? 'visible' : 'hidden'}>
                <Divider sx={{ py: 0.5 }} />
              </Activity>
            </List>
          );
        }

        return (
          <NavGroup
            key={item.id}
            setSelectedID={setSelectedID}
            item={item}
            lastItem={lastItem || undefined}
            remItems={remItems}
            lastItemId={lastItemId}
          />
        );
      default:
        return (
          <Typography key={item.id} variant="h6" align="center" sx={{ color: 'error.main' }}>
            Menu Items Error
          </Typography>
        );
    }
  });

  return <Box {...(drawerOpen && { sx: { mt: 1.5 } })}>{navItems}</Box>;
}

export default memo(MenuList);
