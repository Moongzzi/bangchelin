import { useEffect, useState } from 'react';

import { getMyProfile } from '../../features/auth/auth.api';

export function useAdminPermissionMock() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPermission() {
      try {
        const profile = await getMyProfile();

        if (!isMounted) {
          return;
        }

        setIsAdmin(profile?.role === 'admin');
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isAdmin,
    isLoading,
  } as const;
}
