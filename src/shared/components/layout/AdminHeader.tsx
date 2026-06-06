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
  { key: 'user-management', label: '유저 관리', to: ROUTES.admin },
  { key: 'inquiry-management', label: '문의 관리', to: ROUTES.adminInquiries },
  { key: 'user-home', label: '사용자', to: ROUTES.home, tone: 'primary' },
];

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
      activeNavKey={pathname.startsWith(ROUTES.adminInquiries) ? 'inquiry-management' : undefined}
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
