import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import {
  Header as HeaderRoot,
  type HeaderNavItemData,
} from '../header';

const logo = {
  label: 'BANGCHELIN GUIDE',
  to: ROUTES.home,
  ariaLabel: 'Bangchelin Guide home',
  imageSrc: '/logo.png',
  imageAlt: 'Bangchelin Guide logo',
} as const;

const adminNavigationItems: HeaderNavItemData[] = [
  { key: 'account-auth', label: '계정 인증', to: ROUTES.admin },
  { key: 'user-management', label: '유저 관리', to: ROUTES.adminUsers },
  { key: 'lounge-management', label: '라운지 관리', to: ROUTES.adminLounge },
  { key: 'kakao-share', label: '카카오 공유', to: ROUTES.adminKakaoShare },
  { key: 'inquiry-management', label: '문의 관리', to: ROUTES.adminInquiries },
  { key: 'user-home', label: '사용자', to: ROUTES.home, tone: 'primary' },
];

function getActiveNavKey(pathname: string) {
  if (pathname.startsWith(ROUTES.adminLounge)) {
    return 'lounge-management';
  }

  if (pathname.startsWith(ROUTES.adminKakaoShare)) {
    return 'kakao-share';
  }

  if (pathname.startsWith(ROUTES.adminInquiries)) {
    return 'inquiry-management';
  }

  if (pathname.startsWith(ROUTES.adminUsers)) {
    return 'user-management';
  }

  if (pathname === ROUTES.admin) {
    return 'account-auth';
  }

  return undefined;
}

export function AdminHeader() {
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('header-mobile-menu-open', isMobileMenuOpen);

    return () => {
      document.body.classList.remove('header-mobile-menu-open');
    };
  }, [isMobileMenuOpen]);

  return (
    <HeaderRoot
      logo={logo}
      afterLogo={<span>(admin)</span>}
      navItems={adminNavigationItems}
      actionType="none"
      navAriaLabel="Admin navigation"
      activeNavKey={getActiveNavKey(pathname)}
      mobileMenu={{
        isOpen: isMobileMenuOpen,
        onToggle: () => setIsMobileMenuOpen((open) => !open),
        onClose: () => setIsMobileMenuOpen(false),
        navAriaLabel: 'Admin mobile navigation',
        items: adminNavigationItems,
      }}
      showBottomBorder
    />
  );
}
