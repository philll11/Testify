import { memo, useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { useTheme, Theme } from '@mui/material/styles';

// assets
import { IconMenu2 } from '@tabler/icons-react';

// project imports
import MenuList from '../MenuList';
import LogoSection from '../LogoSection';
import MiniDrawerStyled from './MiniDrawerStyled';

import useConfig from 'hooks/useConfig';
import { drawerWidth } from 'store/constant';
import SimpleBar from 'ui-component/third-party/SimpleBar';

import { useMenu } from 'contexts/MenuContext';

// ==============================|| SIDEBAR DRAWER ||============================== //

function Sidebar() {
  const theme = useTheme();
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const { isDashboardDrawerOpened, toggleDashboardDrawer } = useMenu();
  const drawerOpen = isDashboardDrawerOpened;

  const {
    state: { miniDrawer }
  } = useConfig();

  const logo = useMemo(
    () => (
      <Box sx={{ display: 'flex', p: 2 }}>
        <LogoSection />
      </Box>
    ),
    []
  );

  const drawer = useMemo(() => {
    const drawerContent = (
      <>
        <Stack direction="row" sx={{ justifyContent: 'center', mb: 2 }}>
          <Chip label={import.meta.env.VITE_APP_VERSION} size="small" color="default" />
        </Stack>
      </>
    );

    let drawerSX = { paddingLeft: '0px', paddingRight: '0px', marginTop: '20px' };
    if (drawerOpen) drawerSX = { paddingLeft: '16px', paddingRight: '16px', marginTop: '0px' };

    return (
      <>
        {downMD ? (
          <Box sx={drawerSX}>
            <MenuList />
            {drawerOpen && drawerContent}
          </Box>
        ) : (
          <SimpleBar sx={{ height: '100%', ...drawerSX }}>
            <MenuList />
            {drawerOpen && drawerContent}
          </SimpleBar>
        )}
      </>
    );
  }, [downMD, drawerOpen]);

  return (
    <Box component="nav" sx={{ flexShrink: { md: 0 }, width: { xs: 'auto', md: drawerWidth } }} aria-label="mailbox folders">
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={toggleDashboardDrawer}
          slotProps={{
            paper: {
              sx: {
                mt: downMD ? 0 : 11,
                zIndex: 1099,
                width: drawerWidth,
                bgcolor: 'background.default',
                color: 'text.primary',
                borderRight: 'none'
              }
            }
          }}
          ModalProps={{ keepMounted: true }}
          color="inherit"
        >
          {downMD && logo}
          {drawer}
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {logo}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>{drawer}</Box>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ flexGrow: 1, transition: theme.transitions.create('flex-grow') }} />
              <Avatar
                variant="rounded"
                sx={{
                  ...theme.typography.commonAvatar,
                  ...theme.typography.mediumAvatar,
                  overflow: 'hidden',
                  transition: 'all .2s ease-in-out',
                  color: (theme.vars || theme).palette.secondary.dark,
                  background: (theme.vars || theme).palette.secondary.light,
                  '&:hover': {
                    color: (theme.vars || theme).palette.secondary.light,
                    background: (theme.vars || theme).palette.secondary.dark
                  }
                }}
                onClick={toggleDashboardDrawer}
              >
                <IconMenu2 stroke={1.5} size="20px" />
              </Avatar>
              <Box sx={{ flexGrow: drawerOpen ? 0 : 1, transition: theme.transitions.create('flex-grow') }} />
            </Box>
          </Box>
        </MiniDrawerStyled>
      )}
    </Box>
  );
}

export default memo(Sidebar);
