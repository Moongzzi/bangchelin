import { permissionMockConfig } from './aboutData';

export function useAdminPermissionMock() {
  return {
    isAdmin: permissionMockConfig.isAdmin,
    isLoading: false,
  } as const;
}