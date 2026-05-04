import { colors } from '../../shared/styles/tokens/colors';

export const authLayoutTokens = {
  designViewport: {
    width: 1920,
    height: 1080,
  },
  card: {
    width: 1300,
    height: 754,
    radius: 22,
  },
  backgroundImagePath: 'assets/images/login/background.png',
  panelBackgroundImagePath: 'assets/images/login/panelBackground.png',
  brand: {
    logoSize: 32,
    textSize: 18,
    gap: 5,
  },
} as const;

export const signupPageTokens = {
  dividerColor: colors.text.secondary,
  duplicateCheckBorderColor: colors.border.default,
  profileImagePath: 'assets/icons/register/profile.png',
  profileButtonSize: 150,
  inputWidth: 250,
  inputHeight: 48,
  submitButtonWidth: 180, // 추정값
  submitButtonHeight: 40, // 추정값
  submitButtonRadius: 999,
  formRowGap: 28, // 추정값
  columnGap: 56, // 추정값
} as const;

export const signupFormConfig = {
  nicknameMaxLength: 8,
  introductionMaxLength: 30,
  regions: ['서울', '인천', '경기', '충청', '경상', '전라', '강원', '제주'],
} as const;

export const nicknamePattern = /^[A-Za-z0-9가-힣!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;