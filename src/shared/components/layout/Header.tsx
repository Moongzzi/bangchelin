import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getMyProfile, signOut, type Profile } from '../../../features/auth/auth.api';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../../features/notification/notification.service';
import { getSession } from '../../api/supabaseRest';
import { ROUTES } from '../../constants/routes';
import {
  Header as HeaderRoot,
  type HeaderNavItemData,
  type HeaderNotificationItem,
} from '../header';
import { Popup, type PopupAction } from '../popup';

const logo = {
  label: 'BANGCHELIN GUIDE',
  to: ROUTES.home,
  ariaLabel: 'Bangchelin Guide home',
  imageSrc: '/logo.png',
  imageAlt: 'Bangchelin Guide logo',
} as const;

const publicNavigationItems: HeaderNavItemData[] = [
  { key: 'home', label: '홈', to: ROUTES.home, end: true },
  { key: 'guide', label: '가이드', to: ROUTES.about },
];

const protectedNavigationItems: HeaderNavItemData[] = [
  { key: 'calendar', label: '캘린더', to: ROUTES.calendar },
  { key: 'report', label: '문의/제보', to: ROUTES.report },
];

const adminNavigationItem: HeaderNavItemData = {
  key: 'admin',
  label: '관리자',
  to: ROUTES.admin,
  tone: 'primary',
};

function getNavigationItems(isLoggedIn: boolean, isAdmin: boolean): HeaderNavItemData[] {
  if (!isLoggedIn) {
    return publicNavigationItems;
  }

  return isAdmin
    ? [...publicNavigationItems, ...protectedNavigationItems, adminNavigationItem]
    : [...publicNavigationItems, ...protectedNavigationItems];
}

function getMobileNavigationItems(isLoggedIn: boolean, isAdmin: boolean, onLogout: () => void): HeaderNavItemData[] {
  return [
    ...getNavigationItems(isLoggedIn, isAdmin),
    ...(isLoggedIn
      ? [
          { key: 'profile', label: '프로필', to: ROUTES.profile },
          { key: 'logout', label: '로그아웃', onClick: onLogout },
        ]
      : [{ key: 'login', label: '로그인', to: ROUTES.login }]),
  ];
}

function getActiveNavKey(pathname: string) {
  if (pathname === ROUTES.home) {
    return 'home';
  }

  if (pathname.startsWith(ROUTES.about)) {
    return 'guide';
  }

  if (pathname.startsWith(ROUTES.calendar)) {
    return 'calendar';
  }

  if (pathname.startsWith(ROUTES.report)) {
    return 'report';
  }

  if (pathname.startsWith(ROUTES.admin)) {
    return 'admin';
  }

  if (pathname.startsWith(ROUTES.profile)) {
    return 'profile';
  }

  return undefined;
}

function isProtectedPath(pathname: string) {
  return pathname.startsWith(ROUTES.calendar)
    || pathname.startsWith(ROUTES.report)
    || pathname.startsWith(ROUTES.admin);
}

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getSession()));
  const [notifications, setNotifications] = useState<HeaderNotificationItem[]>([]);
  const [logoutNoticeOpen, setLogoutNoticeOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('header-mobile-menu-open', isMobileMenuOpen);

    return () => {
      document.body.classList.remove('header-mobile-menu-open');
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const session = getSession();
      setIsLoggedIn(Boolean(session));

      if (!session) {
        setProfile(null);
        setNotifications([]);
        return;
      }

      try {
        const [nextProfile, nextNotifications] = await Promise.all([
          getMyProfile(),
          getNotifications(),
        ]);

        if (isMounted) {
          setProfile(nextProfile);
          setNotifications(nextNotifications);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function reloadProfile() {
      const session = getSession();
      setIsLoggedIn(Boolean(session));

      if (!session) {
        setProfile(null);
        setNotifications([]);
        return;
      }

      try {
        const [nextProfile, nextNotifications] = await Promise.all([
          getMyProfile(),
          getNotifications(),
        ]);

        if (isMounted) {
          setProfile(nextProfile);
          setNotifications(nextNotifications);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    }

    window.addEventListener('bangchelin:profile-updated', reloadProfile);

    return () => {
      isMounted = false;
      window.removeEventListener('bangchelin:profile-updated', reloadProfile);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    let isMounted = true;

    async function reloadNotifications() {
      try {
        const nextNotifications = await getNotifications();

        if (isMounted) {
          setNotifications(nextNotifications);
        }
      } catch {
        if (isMounted && !getSession()) {
          setNotifications([]);
          setIsLoggedIn(false);
        }
      }
    }

    const intervalId = window.setInterval(reloadNotifications, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  const profileName = profile?.nickname || profile?.username || 'Profile';
  const isAdmin = profile?.role === 'admin';
  const navItems = getNavigationItems(isLoggedIn, isAdmin);

  function handleLogout() {
    const shouldShowProtectedPageNotice = isProtectedPath(pathname);

    signOut();
    setProfile(null);
    setIsLoggedIn(false);
    setNotifications([]);
    navigate(ROUTES.home);

    if (shouldShowProtectedPageNotice) {
      setLogoutNoticeOpen(true);
    }
  }

  const logoutNoticeActions: PopupAction[] = [
    {
      label: '확인',
      variant: 'filled',
      onClick: () => setLogoutNoticeOpen(false),
    },
  ];

  async function handleNotificationClick(notification: HeaderNotificationItem) {
    try {
      await markNotificationAsRead(notification.id);
      setNotifications((currentNotifications) =>
        currentNotifications.map((currentNotification) =>
          currentNotification.id === notification.id
            ? { ...currentNotification, read: true }
            : currentNotification,
        ),
      );
    } catch {
      setNotifications([]);
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    try {
      await markAllNotificationsAsRead(notifications.map((notification) => notification.id));
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({ ...notification, read: true })),
      );
    } catch {
      setNotifications([]);
    }
  }

  return (
    <>
      <HeaderRoot
        logo={logo}
        navItems={navItems}
        actionType={isLoggedIn ? 'profile' : 'loginIcon'}
        loginTo={ROUTES.login}
        profileTo={ROUTES.profile}
        profileLabel={profileName}
        profileInitial={profileName.slice(0, 1).toUpperCase()}
        profileImageSrc={profile?.avatar_url}
        profileMenuItems={[
          { key: 'logout', label: '로그아웃', onClick: handleLogout },
          { key: 'profile', label: '프로필', to: ROUTES.profile },
        ]}
        notifications={
          isLoggedIn
            ? {
                items: notifications,
                onItemClick: handleNotificationClick,
                onMarkAllRead: handleMarkAllNotificationsAsRead,
              }
            : undefined
        }
        navAriaLabel="Global navigation"
        activeNavKey={getActiveNavKey(pathname)}
        mobileMenu={{
          isOpen: isMobileMenuOpen,
          onToggle: () => setIsMobileMenuOpen((open) => !open),
          onClose: () => setIsMobileMenuOpen(false),
          navAriaLabel: 'Mobile navigation',
          items: getMobileNavigationItems(isLoggedIn, isAdmin, handleLogout),
        }}
        showBottomBorder
      />

      <Popup
        open={logoutNoticeOpen}
        onClose={() => setLogoutNoticeOpen(false)}
        title="로그아웃 완료"
        description="로그인이 필요한 페이지에서 로그아웃되어 홈으로 이동했습니다."
        actions={logoutNoticeActions}
        maxWidth={366}
      />
    </>
  );
}
