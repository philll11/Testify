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

// platform routing
const ProfileList = Loadable(lazy(() => import('views/platform/profiles/ProfileList')));
const ProfileCreatePage = Loadable(lazy(() => import('views/platform/profiles/pages/ProfileCreatePage')));
const ProfileViewPage = Loadable(lazy(() => import('views/platform/profiles/pages/ProfileViewPage')));
const ProfileEditPage = Loadable(lazy(() => import('views/platform/profiles/pages/ProfileEditPage')));

const EnvironmentList = Loadable(lazy(() => import('views/platform/environments/EnvironmentList')));
const EnvironmentCreatePage = Loadable(lazy(() => import('views/platform/environments/pages/EnvironmentCreatePage')));
const EnvironmentViewPage = Loadable(lazy(() => import('views/platform/environments/pages/EnvironmentViewPage')));
const EnvironmentEditPage = Loadable(lazy(() => import('views/platform/environments/pages/EnvironmentEditPage')));

// user routing
const AccountProfile = Loadable(lazy(() => import('views/iam/users/pages/account-profile/AccountProfile')));

// discovery routing
const CollectionBuilderPage = Loadable(lazy(() => import('views/discovery/collection-builder')));

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
    },
    {
      path: 'platform',
      children: [
        {
          path: 'profiles',
          children: [
            {
              path: '',
              element: <ProfileList />
            },
            {
              path: 'create',
              element: <ProfileCreatePage />
            },
            {
              path: ':id',
              element: <ProfileViewPage />
            },
            {
              path: ':id/edit',
              element: <ProfileEditPage />
            }
          ]
        },
        {
          path: 'environments',
          children: [
            {
              path: '',
              element: <EnvironmentList />
            },
            {
              path: 'create',
              element: <EnvironmentCreatePage />
            },
            {
              path: ':id',
              element: <EnvironmentViewPage />
            },
            {
              path: ':id/edit',
              element: <EnvironmentEditPage />
            }
          ]
        }
      ]
    },
    {
      path: 'discovery',
      children: [
        {
          path: 'collection-builder',
          element: <CollectionBuilderPage />
        }
      ]
    }
  ]
};

export default MainRoutes;
