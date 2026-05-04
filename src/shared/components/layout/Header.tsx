import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Header as HeaderRoot, type HeaderNavItemData, HomeIcon } from '../header';
import { ROUTES } from '../../constants/routes';

const logo = {
  label: 'BANGCHELIN GUIDE',
  to: ROUTES.home,
  ariaLabel: 'Bangchelin Guide home',
  imageSrc: '/logo.png',
  imageAlt: 'Bangchelin Guide logo',
} as const;

const navigationItems: HeaderNavItemData[] = [
  { key: 'home', label: '홈', to: ROUTES.home, icon: <HomeIcon />, end: true },
  { key: 'guide', label: '가이드', to: ROUTES.about },
  { key: 'calendar', label: '캘린더', to: ROUTES.calendar },
  { key: 'report', label: '문의/제보', to: ROUTES.report },
];

const mobileNavigationItems: HeaderNavItemData[] = [
  ...navigationItems,
  { key: 'login', label: '로그인', to: ROUTES.login },
];

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

  return undefined;
}

export function Header() {
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <HeaderRoot
      logo={logo}
      navItems={navigationItems}
      actionType="loginIcon"
      loginTo={ROUTES.login}
      navAriaLabel="Global navigation"
      activeNavKey={getActiveNavKey(pathname)}
      mobileMenu={{
        isOpen: isMobileMenuOpen,
        onToggle: () => setIsMobileMenuOpen((open) => !open),
        onClose: () => setIsMobileMenuOpen(false),
        navAriaLabel: 'Mobile navigation',
        items: mobileNavigationItems,
      }}
      showBottomBorder
    />
  );
}