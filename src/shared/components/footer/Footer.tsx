import type { CSSProperties, ReactNode } from 'react';

import { colors } from '../../styles/tokens/colors';
import { footerFoundation } from './footerFoundation';
import styles from './Footer.module.css';

export type FooterPolicyLink = {
  key: string;
  label: string;
  href: string;
};

export type FooterNoticeItem = {
  key: string;
  text: string;
};

export type FooterMetaItem = {
  key: string;
  label: string;
  href?: string;
};

export type FooterSocialLink = {
  key: string;
  label: string;
  href: string;
  ariaLabel?: string;
  icon?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
};

type FooterContainerProps = {
  maxWidth?: number | string;
  children: ReactNode;
};

type FooterPolicyItemProps = {
  item: FooterPolicyLink;
  emphasized: boolean;
};

type FooterMetaProps = {
  item: FooterMetaItem;
};

type FooterSocialButtonProps = {
  item: FooterSocialLink;
};

export type FooterProps = {
  policyLinks: FooterPolicyLink[];
  notices: FooterNoticeItem[];
  metaItems: FooterMetaItem[];
  socialLinks: FooterSocialLink[];
  className?: string;
  maxWidth?: number | string;
  background?: string;
  emphasizedPolicyKey?: string;
  socialTitle?: string;
  showTopDivider?: boolean;
  showBottomDivider?: boolean;
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

  return `${footerFoundation.maxWidth}px`;
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.25c4.7 0 8.5 3.13 8.5 7s-3.8 7-8.5 7c-.56 0-1.12-.05-1.66-.15l-4.13 2.32.96-3.64C5.24 14.52 3.5 12.02 3.5 10.25c0-3.87 3.8-7 8.5-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.77 6.66a15.7 15.7 0 0 0-3.92-1.23l-.19.39a14.6 14.6 0 0 1 3.76 1.26 12.14 12.14 0 0 0-3.92-.96c-.26.48-.46.98-.61 1.5a11.8 11.8 0 0 0-3.78 0c-.15-.52-.35-1.02-.61-1.5a12.21 12.21 0 0 0-3.92.96 14.62 14.62 0 0 1 3.76-1.26l-.19-.39c-1.36.19-2.67.6-3.92 1.23C2.6 10.58 2.28 14.37 2.4 18.1a15.93 15.93 0 0 0 4.81 2.4l1.03-1.67c-.58-.2-1.13-.47-1.64-.8.14.1 1.87 1.4 5.4 1.4s5.26-1.3 5.4-1.4c-.51.33-1.06.6-1.64.8l1.03 1.67a15.86 15.86 0 0 0 4.81-2.4c.14-4.34-.24-8.11-2.83-11.44ZM9.64 14.88c-.8 0-1.46-.74-1.46-1.66s.65-1.66 1.46-1.66c.81 0 1.47.75 1.46 1.66 0 .92-.65 1.66-1.46 1.66Zm4.72 0c-.81 0-1.46-.74-1.46-1.66s.65-1.66 1.46-1.66c.8 0 1.47.75 1.46 1.66 0 .92-.65 1.66-1.46 1.66Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FooterContainer({ maxWidth, children }: FooterContainerProps) {
  const style = {
    '--footer-max-width': resolveWidthValue(maxWidth),
  } as CSSProperties;

  return (
    <div className={styles.container} style={style}>
      {children}
    </div>
  );
}

function FooterPolicyItem({ item, emphasized }: FooterPolicyItemProps) {
  return (
    <li>
      <a
        href={item.href}
        className={joinClassNames(styles.policyLink, emphasized && styles.policyLinkEmphasized)}
      >
        {item.label}
      </a>
    </li>
  );
}

function FooterMetaEntry({ item }: FooterMetaProps) {
  return (
    <li className={styles.metaItem}>
      {item.href ? (
        <a href={item.href} className={styles.metaLink}>
          {item.label}
        </a>
      ) : (
        <span>{item.label}</span>
      )}
    </li>
  );
}

function FooterSocialButton({ item }: FooterSocialButtonProps) {
  return (
    <li>
      <a
        href={item.href}
        className={styles.socialButton}
        aria-label={item.ariaLabel ?? item.label}
        title={item.label}
      >
        <span className={styles.socialIcon}>
          {item.imageSrc ? (
            <img
              src={item.imageSrc}
              alt={item.imageAlt ?? ''}
              className={styles.socialImage}
              aria-hidden={item.imageAlt ? undefined : true}
            />
          ) : (
            item.icon
          )}
        </span>
      </a>
    </li>
  );
}

export function Footer({
  policyLinks,
  notices,
  metaItems,
  socialLinks,
  className,
  maxWidth,
  background,
  emphasizedPolicyKey,
  socialTitle = '<방탈출 미식 협회> SNS 바로가기',
  showTopDivider = false,
  showBottomDivider = false,
}: FooterProps) {
  const footerStyle = {
    '--footer-background': background ?? colors.surface.default,
    '--footer-text': colors.text.tertiary,
    '--footer-text-strong': colors.text.primary,
    '--footer-divider': colors.border.default,
    '--footer-social-background': colors.brand.primary,
    '--footer-social-icon': colors.surface.overlay,
    '--footer-focus-ring': colors.accent.rose,
  } as CSSProperties;

  return (
    <footer
      className={joinClassNames(
        styles.footer,
        showTopDivider && styles.withTopDivider,
        showBottomDivider && styles.withBottomDivider,
        className,
      )}
      style={footerStyle}
    >
      <FooterContainer maxWidth={maxWidth}>
        <div className={styles.inner}>
          <ul className={styles.policyList}>
            {policyLinks.map((item) => (
              <FooterPolicyItem
                key={item.key}
                item={item}
                emphasized={item.key === emphasizedPolicyKey}
              />
            ))}
          </ul>

          <section className={styles.section} aria-label="Footer notices">
            <ul className={styles.noticeList}>
              {notices.map((item) => (
                <li key={item.key} className={styles.noticeItem}>
                  {item.text}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-label="Footer meta information">
            <ul className={styles.metaList}>
              {metaItems.map((item) => (
                <FooterMetaEntry key={item.key} item={item} />
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-label="Footer social links">
            <p className={styles.socialTitle}>{socialTitle}</p>
            <ul className={styles.socialList}>
              {socialLinks.map((item) => (
                <FooterSocialButton
                  key={item.key}
                  item={{
                    ...item,
                    icon:
                      item.icon ?? (item.key === 'discord' ? <DiscordIcon /> : <KakaoIcon />),
                  }}
                />
              ))}
            </ul>
          </section>
        </div>
      </FooterContainer>
    </footer>
  );
}