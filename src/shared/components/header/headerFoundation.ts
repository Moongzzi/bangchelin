export const headerFoundation = {
  maxWidth: 'none',
  height: {
    compact: 76,
    desktop: 80,
  },
  paddingInline: {
    mobile: 20,
    desktop: 20,
  },
  spacing: {
    logoGap: 14,
    navGap: 32,
    actionGap: 16,
  },
  sizes: {
    brandIcon: 34,
    menuButton: 44,
    loginButton: 44,
    profileBadge: 52,
  },
} as const;

export type HeaderFoundation = typeof headerFoundation;