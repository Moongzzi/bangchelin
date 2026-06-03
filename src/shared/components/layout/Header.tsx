import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getMyProfile, signOut, type Profile } from '../../../features/auth/auth.api';
import { getSession } from '../../api/supabaseRest';
import { ROUTES } from '../../constants/routes';
import { Header as HeaderRoot, type HeaderNavItemData } from '../header';
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

function getNavigationItems(isLoggedIn: boolean): HeaderNavItemData[] {
  return isLoggedIn ? [...publicNavigationItems, ...protectedNavigationItems] : publicNavigationItems;
}

function getMobileNavigationItems(isLoggedIn: boolean): HeaderNavItemData[] {
  return [
    ...getNavigationItems(isLoggedIn),
    isLoggedIn
      ? { key: 'profile', label: '프로필', to: ROUTES.profile }
      : { key: 'login', label: '로그인', to: ROUTES.login },
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

  if (pathname.startsWith(ROUTES.profile)) {
    return 'profile';
  }

  return undefined;
}

function isProtectedPath(pathname: string) {
  return pathname.startsWith(ROUTES.calendar) || pathname.startsWith(ROUTES.report);
}

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getSession()));
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
        return;
      }

      try {
        const nextProfile = await getMyProfile();

        if (isMounted) {
          setProfile(nextProfile);
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

  const profileName = profile?.nickname || profile?.username || 'Profile';
  const navItems = getNavigationItems(isLoggedIn);

  function handleLogout() {
    const shouldShowProtectedPageNotice = isProtectedPath(pathname);

    signOut();
    setProfile(null);
    setIsLoggedIn(false);
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
        profileMenuItems={[
          { key: 'logout', label: '로그아웃', onClick: handleLogout },
          { key: 'profile', label: '프로필', to: ROUTES.profile },
        ]}
        navAriaLabel="Global navigation"
        activeNavKey={getActiveNavKey(pathname)}
        mobileMenu={{
          isOpen: isMobileMenuOpen,
          onToggle: () => setIsMobileMenuOpen((open) => !open),
          onClose: () => setIsMobileMenuOpen(false),
          navAriaLabel: 'Mobile navigation',
          items: getMobileNavigationItems(isLoggedIn),
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
