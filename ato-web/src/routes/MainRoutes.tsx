import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('views/dashboard')));

// iam routing
const RoleList = Loadable(lazy(() => import('views/iam/roles/RoleList')));
const RoleCreatePage = Loadable(lazy(() => import('views/iam/roles/pages/RoleCreatePage')));
const RoleEditPage = Loadable(lazy(() => import('views/iam/roles/pages/RoleEditPage')));
const RoleViewPage = Loadable(lazy(() => import('views/iam/roles/pages/RoleViewPage')));

const UserList = Loadable(lazy(() => import('views/iam/users/UserList')));
const UserCreatePage = Loadable(lazy(() => import('views/iam/users/pages/UserCreatePage')));
const UserEditPage = Loadable(lazy(() => import('views/iam/users/pages/UserEditPage')));
const UserViewPage = Loadable(lazy(() => import('views/iam/users/pages/UserViewPage')));

// system routing
const SystemSettingsPage = Loadable(lazy(() => import('views/system/config/SystemSettingsPage')));

// user routing
const AccountProfile = Loadable(lazy(() => import('views/iam/users/pages/account-profile/AccountProfile')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes: RouteObject = {
  path: '/',
  element: (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  ),
  children: [
    {
      path: '/',
      element: <DashboardDefault />
    },
    {
      path: 'dashboard',
      element: <DashboardDefault />
    },
    {
      path: 'user',
      children: [
        {
          path: 'account',
          element: <AccountProfile />
        }
      ]
    },
    {
      path: 'roles',
      children: [
        {
          path: '',
          element: <RoleList />
        },
        {
          path: 'create',
          element: <RoleCreatePage />
        },
        {
          path: ':id',
          element: <RoleViewPage />
        },
        {
          path: ':id/edit',
          element: <RoleEditPage />
        }
      ]
    },
    {
      path: 'users',
      children: [
        {
          path: '',
          element: <UserList />
        },
        {
          path: 'create',
          element: <UserCreatePage />
        },
        {
          path: ':id',
          element: <UserViewPage />
        },
        {
          path: ':id/edit',
          element: <UserEditPage />
        }
      ]
    },
    {
      path: 'system',
      children: [
        {
          path: 'settings',
          element: <SystemSettingsPage />
        }
      ]
    }
  ]
};

export default MainRoutes;
