const fontFamily = {
  korean:
    '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
  latin:
    '"GmarketSans", "Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  base:
    '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
  heading:
    '"GmarketSans", "Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
} as const;

const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
} as const;

const lineHeight = {
  compact: 1.35,
  snug: 1.45,
  normal: 1.6,
  relaxed: 1.7,
} as const;

const letterSpacing = {
  tighter: '-0.02em',
  tight: '-0.012em',
  normal: '0',
  wide: '0.01em',
  wider: '0.02em',
} as const;

const textStyle = {
  display: {
    xl: {
      fontFamily: fontFamily.heading,
      fontWeight: fontWeight.bold,
      fontSize: fontSize['4xl'],
      lineHeight: lineHeight.compact,
      letterSpacing: letterSpacing.tighter,
    },
    lg: {
      fontFamily: fontFamily.heading,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize['3xl'],
      lineHeight: lineHeight.compact,
      letterSpacing: letterSpacing.tight,
    },
  },
  heading: {
    xl: {
      fontFamily: fontFamily.heading,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize['2xl'],
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.tight,
    },
    lg: {
      fontFamily: fontFamily.heading,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.xl,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.tight,
    },
    md: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
  },
  title: {
    lg: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.normal,
    },
    md: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.md,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    sm: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.wide,
    },
  },
  body: {
    lg: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.regular,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.relaxed,
      letterSpacing: letterSpacing.normal,
    },
    md: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.regular,
      fontSize: fontSize.md,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    sm: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.regular,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.wide,
    },
  },
  label: {
    lg: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.md,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.wide,
    },
    md: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.wide,
    },
    sm: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.xs,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.wider,
    },
  },
  caption: {
    md: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.regular,
      fontSize: fontSize.xs,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.wide,
    },
    sm: {
      fontFamily: fontFamily.base,
      fontWeight: fontWeight.regular,
      fontSize: fontSize.xs,
      lineHeight: lineHeight.snug,
      letterSpacing: letterSpacing.wider,
    },
  },
} as const;

export const typography = {
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  textStyle,
} as const;

export const themeTypography = {
  light: typography,
} as const;

export type TypographyTokens = typeof typography;
export type TypographyTextStyles = typeof textStyle;
export type ThemeTypography = typeof themeTypography;