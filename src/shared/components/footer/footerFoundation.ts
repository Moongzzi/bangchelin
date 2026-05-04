export const footerFoundation = {
  maxWidth: 'none',
  paddingInline: {
    mobile: 24,
    desktop: 40,
  },
  paddingBlock: {
    mobile: 32,
    desktop: 40,
  },
  spacing: {
    section: 28,
    socialGap: 14,
    policyGap: 18,
  },
  sizes: {
    socialButton: 54,
    socialIcon: 24,
    contentColumn: 680,
  },
} as const;

export type FooterFoundation = typeof footerFoundation;