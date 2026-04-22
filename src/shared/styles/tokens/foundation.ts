export const foundation = {
  radius: {
    sm: '0.75rem',
    md: '1.25rem',
    lg: '1.75rem',
  },
  shadow: {
    soft: '0 18px 60px rgba(32, 28, 25, 0.14)',
  },
  layout: {
    contentWidth: 'min(1120px, calc(100vw - 2rem))',
  },
} as const;

export type FoundationTokens = typeof foundation;