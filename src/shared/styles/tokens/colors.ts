const lightColors = {
  brand: {
    primary: '#8B1E2D',
    primaryHover: '#741826',
    primaryPressed: '#5E131E',
    primarySoft: '#E9C7CC',
  },
  accent: {
    navy: '#223041',
    navyHover: '#1A2634',
    green: '#31493C',
    greenHover: '#273A30',
    gold: '#A78643',
    goldSoft: '#E7D9B4',
    rose: '#C07B84',
    roseSoft: '#F1D7DB',
  },
  background: {
    default: '#F5F0E6',
    subtle: '#F9F5EE',
    elevated: '#FFFDF9',
    secondary: '#E9DECD',
    tertiary: '#DDD0BC',
  },
  surface: {
    default: '#E9DECD',
    elevated: '#FDF8F1',
    overlay: '#FFFAF3',
  },
  border: {
    default: '#CFC2AF',
    strong: '#B8AA96',
    subtle: '#E5DACB',
  },
  text: {
    primary: '#201C19',
    secondary: '#4A433B',
    tertiary: '#6C645C',
    inverse: '#F8F3EA',
    onPrimary: '#FFF8F2',
    onDark: '#F4EBDD',
    primaryAlpha40: 'rgba(32, 28, 25, 0.4)',
  },
  semantic: {
    success: '#4D6A57',
    successSoft: '#DCE8E0',
    warning: '#B07A2E',
    warningSoft: '#F1E3C8',
    error: '#9B3442',
    errorSoft: '#F0D8DC',
    info: '#4A627A',
    infoSoft: '#DCE4EC',
  },
} as const;

export const colors = lightColors;

export const themeColors = {
  light: lightColors,
} as const;

export type ColorTokens = typeof colors;
export type ThemeColors = typeof themeColors;