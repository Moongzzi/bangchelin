import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { Link, NavLink, type To } from 'react-router-dom';

import { colors } from '../../styles/tokens/colors';
import { headerFoundation } from './headerFoundation';
import styles from './Header.module.css';

const assetBasePath = import.meta.env.BASE_URL;

export type HeaderActionType = 'hamburger' | 'profile' | 'loginIcon' | 'none';

export type HeaderNavItemData = {
  key: string;
  label: string;
  to: To;
  icon?: ReactNode;
  end?: boolean;
};

export type HeaderLogoData = {
  label: string;
  to: To;
  ariaLabel?: string;
  icon?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
};

export type HeaderProfileMenuItem = {
  key: string;
  label: string;
  to?: To;
  onClick?: () => void;
};

type HeaderBaseLinkProps = {
  to: To;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

type HeaderNavLinkProps = HeaderBaseLinkProps & {
  end?: boolean;
  isActive?: boolean;
  onNavigate?: () => void;
};

type ContainerProps = {
  maxWidth?: number | string;
  children: ReactNode;
};

type HeaderLogoProps = {
  logo: HeaderLogoData;
};

type NavItemProps = {
  item: HeaderNavItemData;
  isActive: boolean;
};

type IconButtonProps = {
  ariaLabel: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

type IconLinkProps = {
  to: To;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

type HeaderActionsProps = {
  actionType: HeaderActionType;
  onMenuClick?: () => void;
  profileLabel?: string;
  profileInitial?: string;
  profileImageSrc?: string | null;
  profileTo?: To;
  profileMenuItems?: HeaderProfileMenuItem[];
  loginTo?: To;
  rightActions?: ReactNode;
};

export type HeaderMobileMenu = {
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  navAriaLabel?: string;
  items?: HeaderNavItemData[];
  footerContent?: ReactNode;
};

export type HeaderProps = {
  logo: HeaderLogoData;
  navItems: HeaderNavItemData[];
  actionType: HeaderActionType;
  profileLabel?: string;
  profileInitial?: string;
  profileImageSrc?: string | null;
  profileTo?: To;
  profileMenuItems?: HeaderProfileMenuItem[];
  onMenuClick?: () => void;
  loginTo?: To;
  className?: string;
  rightActions?: ReactNode;
  isCompact?: boolean;
  showBottomBorder?: boolean;
  maxWidth?: number | string;
  navAriaLabel?: string;
  activeNavKey?: string;
  mobileMenu?: HeaderMobileMenu;
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function resolveWidthValue(maxWidth?: number | string) {
  if (typeof maxWidth === 'number') {
    return `${maxWidth}px`;
  }

  if (typeof maxWidth === 'string') {
    return maxWidth;
  }

  return `${headerFoundation.maxWidth}px`;
}

function HeaderTextLink({ to, className, ariaLabel, children }: HeaderBaseLinkProps) {
  return (
    <Link to={to} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

function HeaderTextNavLink({
  to,
  className,
  ariaLabel,
  children,
  end,
  isActive,
  onNavigate,
}: HeaderNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={ariaLabel}
      className={({ isActive: routerActive }) =>
        joinClassNames(className, (routerActive || isActive) && styles.navItemActive)
      }
      onClick={onNavigate}
    >
      {children}
    </NavLink>
  );
}

export function Container({ maxWidth, children }: ContainerProps) {
  const style = {
    '--header-max-width': resolveWidthValue(maxWidth),
  } as CSSProperties;

  return (
    <div className={styles.container} style={style}>
      {children}
    </div>
  );
}

function BrandMarkIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 4.5c3.6 0 6.5 2.9 6.5 6.5 0 5.1-6.5 9.2-6.5 9.2S14 16.1 14 11c0-3.6 2.9-6.5 6.5-6.5Z" />
        <path d="M35.5 20c0 3.6-2.9 6.5-6.5 6.5-5.1 0-9.2-6.5-9.2-6.5s4.1-6.5 9.2-6.5c3.6 0 6.5 2.9 6.5 6.5Z" />
        <path d="M20.5 35.5c-3.6 0-6.5-2.9-6.5-6.5 0-5.1 6.5-9.2 6.5-9.2s6.5 4.1 6.5 9.2c0 3.6-2.9 6.5-6.5 6.5Z" />
        <path d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5 5.1 0 9.2 6.5 9.2 6.5S17.1 26.5 12 26.5c-3.6 0-6.5-2.9-6.5-6.5Z" />
        <path d="M11.2 11.2 28.8 28.8" />
      </g>
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M10 14.5h24" />
        <path d="M10 22h24" />
        <path d="M10 29.5h24" />
      </g>
    </svg>
  );
}

function LoginIcon() {
  return (
    <span
      className={styles.iconMask}
      style={{ '--header-icon-mask': `url(${assetBasePath}assets/icons/header/logIn.png)` } as CSSProperties}
      aria-hidden="true"
    />
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M14 14 30 30" />
        <path d="M30 14 14 30" />
      </g>
    </svg>
  );
}

export function HeaderLogo({ logo }: HeaderLogoProps) {
  return (
    <HeaderTextLink
      to={logo.to}
      className={styles.logo}
      ariaLabel={logo.ariaLabel ?? `${logo.label} home`}
    >
      <span className={styles.logoMark}>
        {logo.imageSrc ? (
          <img
            src={logo.imageSrc}
            alt={logo.imageAlt ?? ''}
            className={styles.logoImage}
            aria-hidden={logo.imageAlt ? undefined : true}
          />
        ) : (
          logo.icon ?? <BrandMarkIcon />
        )}
      </span>
      <span className={styles.logoText}>{logo.label}</span>
    </HeaderTextLink>
  );
}

export function NavItem({ item, isActive }: NavItemProps) {
  return (
    <HeaderTextNavLink
      to={item.to}
      end={item.end}
      className={styles.navItem}
      isActive={isActive}
      ariaLabel={item.label}
    >
      {item.icon ? <span className={styles.navIcon}>{item.icon}</span> : null}
      <span>{item.label}</span>
    </HeaderTextNavLink>
  );
}

export function IconButton({ ariaLabel, onClick, className, children }: IconButtonProps) {
  return (
    <button
      type="button"
      className={joinClassNames(styles.iconButton, className)}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function IconLink({ to, ariaLabel, className, children }: IconLinkProps) {
  return (
    <Link to={to} className={joinClassNames(styles.iconButton, className)} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

export function HeaderActions({
  actionType,
  onMenuClick,
  profileLabel,
  profileInitial,
  profileImageSrc,
  profileTo,
  profileMenuItems,
  loginTo,
  rightActions,
}: HeaderActionsProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const profileBadgeContent = profileImageSrc ? (
    <img src={profileImageSrc} alt="" className={styles.profileBadgeImage} aria-hidden="true" />
  ) : (
    profileInitial ?? 'B'
  );

  return (
    <div className={styles.actions}>
      {actionType === 'hamburger' ? (
        <IconButton ariaLabel="Open navigation menu" onClick={onMenuClick}>
          <HamburgerIcon />
        </IconButton>
      ) : null}
      {actionType === 'loginIcon' ? (
        loginTo ? (
          <IconLink to={loginTo} ariaLabel="Login or enter account area">
            <LoginIcon />
          </IconLink>
        ) : (
          <IconButton ariaLabel="Login or enter account area">
            <LoginIcon />
          </IconButton>
        )
      ) : null}
      {actionType === 'profile' ? (
        profileMenuItems?.length ? (
          <div className={styles.profileMenuWrap} ref={profileMenuRef}>
            <button
              type="button"
              className={styles.profileBadge}
              aria-label={profileLabel ?? 'Open profile menu'}
              title={profileLabel}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
            >
              {profileBadgeContent}
            </button>
            {isProfileMenuOpen ? (
              <div className={styles.profileMenu} role="menu">
                {profileMenuItems.map((item) => (
                  item.to ? (
                    <Link
                      key={item.key}
                      to={item.to}
                      className={styles.profileMenuItem}
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        item.onClick?.();
                      }}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      className={styles.profileMenuItem}
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        item.onClick?.();
                      }}
                    >
                      {item.label}
                    </button>
                  )
                ))}
              </div>
            ) : null}
          </div>
        ) : profileTo ? (
            <Link
              to={profileTo}
              className={styles.profileBadge}
              aria-label={profileLabel ?? 'Open profile'}
              title={profileLabel}
            >
              {profileBadgeContent}
            </Link>
          ) : (
          <button
            type="button"
            className={styles.profileBadge}
            aria-label={profileLabel ?? 'Open profile menu'}
            title={profileLabel}
          >
            {profileBadgeContent}
          </button>
        )
      ) : null}
      {rightActions ? <div className={styles.actionSlot}>{rightActions}</div> : null}
    </div>
  );
}

export function Header({
  logo,
  navItems,
  actionType,
  profileLabel,
  profileInitial,
  profileImageSrc,
  profileTo,
  profileMenuItems,
  onMenuClick,
  loginTo,
  className,
  rightActions,
  isCompact = false,
  showBottomBorder = true,
  maxWidth,
  navAriaLabel = 'Primary navigation',
  activeNavKey,
  mobileMenu,
}: HeaderProps) {
  const compact = isCompact || actionType === 'hamburger';
  const mobileNavItems = mobileMenu?.items ?? navItems;
  const headerStyle = {
    '--header-background': colors.background.default,
    '--header-border': colors.border.default,
    '--header-brand': colors.brand.primary,
    '--header-text': colors.text.primary,
    '--header-text-hover': colors.text.primary,
    '--header-profile-background': colors.accent.rose,
    '--header-profile-text': colors.text.primary,
    '--header-focus-ring': colors.accent.rose,
  } as CSSProperties;

  return (
    <header
      className={joinClassNames(
        styles.header,
        showBottomBorder && styles.withBorder,
        compact && styles.compact,
        className,
      )}
      style={headerStyle}
    >
      <Container maxWidth={maxWidth}>
        <div className={joinClassNames(styles.row, compact && styles.compactRow)}>
          <div className={styles.left}>
            <HeaderLogo logo={logo} />
          </div>
          <div className={styles.right}>
            {!compact && navItems.length > 0 ? (
              <nav className={styles.nav} aria-label={navAriaLabel}>
                <div className={styles.navList}>
                  {navItems.map((item) => (
                    <NavItem key={item.key} item={item} isActive={activeNavKey === item.key} />
                  ))}
                </div>
              </nav>
            ) : null}
            <div className={styles.desktopActions}>
              <HeaderActions
                actionType={actionType}
                onMenuClick={onMenuClick}
                profileLabel={profileLabel}
                profileInitial={profileInitial}
                profileImageSrc={profileImageSrc}
                profileTo={profileTo}
                profileMenuItems={profileMenuItems}
                loginTo={loginTo}
                rightActions={rightActions}
              />
            </div>
            {mobileMenu ? (
              <div className={styles.mobileMenuTrigger}>
                <IconButton
                  ariaLabel={mobileMenu.isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  onClick={mobileMenu.onToggle}
                  className={styles.mobileMenuButton}
                >
                  {mobileMenu.isOpen ? <CloseIcon /> : <HamburgerIcon />}
                </IconButton>
              </div>
            ) : null}
          </div>
        </div>
        {mobileMenu ? (
          <div
            className={joinClassNames(
              styles.mobilePanel,
              mobileMenu.isOpen && styles.mobilePanelOpen,
            )}
            hidden={!mobileMenu.isOpen}
          >
            <nav
              className={styles.mobileNav}
              aria-label={mobileMenu.navAriaLabel ?? navAriaLabel}
            >
              {mobileNavItems.map((item) => (
                <HeaderTextNavLink
                  key={item.key}
                  to={item.to}
                  end={item.end}
                  className={styles.mobileNavItem}
                  isActive={activeNavKey === item.key}
                  ariaLabel={item.label}
                  onNavigate={mobileMenu.onClose}
                >
                  {item.icon ? <span className={styles.navIcon}>{item.icon}</span> : null}
                  <span>{item.label}</span>
                </HeaderTextNavLink>
              ))}
            </nav>
            {mobileMenu.footerContent ? (
              <div className={styles.mobilePanelFooter}>{mobileMenu.footerContent}</div>
            ) : null}
          </div>
        ) : null}
      </Container>
    </header>
  );
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.8 8 2.7l5.5 4.1v6.5H9.8V9.6H6.2v3.7H2.5V6.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
