import { ROUTES } from '../../shared/constants/routes';

export const homeHeroContent = {
  eyebrow: 'Community Landing',
  title: "BANGCHELIN GUIDE와 '미방(美房)'의 여정을 함께하세요.",
  descriptionLines: [
    'BANGCHELIN GUIDE는 카카오톡 오픈채팅',
    '<방탈출 미식 협회>에서 운영하는 커뮤니티용 웹사이트입니다.',
  ],
} as const;

export const quickRuleSections = [
  {
    title: '[기본 사항]',
    items: [
      '1. 프로필은 오픈프로필로 설정할 것',
      '2. 닉네임은 아래 양식과 같이 설정할 것',
      '→ 닉네임/테마 플레이 수/실명 구분',
      '(닉네임은 중복되지 않도록 설정)',
    ],
  },
  {
    title: '[운영 방침]',
    items: [
      '1. 친목방이니 자유롭게 대화하고 활동해주세요.',
      '2. 노쇼/지각 등의 경우, 상세 규칙에 의거하여 경고 및 추방 조치가 이루어질 수 있습니다.',
      '3. 제보 신고는 증거 원칙을 기준으로 진행됩니다.',
      '증거 부재 시, 운영진이 관여하지 않을 수 있습니다.',
    ],
  },
] as const;

export const homeCtas = [
  {
    key: 'guide',
    label: '규칙 보러가기',
    to: ROUTES.about,
    variant: 'primary',
  },
  {
    key: 'report',
    label: '문의/제보 하러가기',
    to: ROUTES.report,
    variant: 'secondary',
  },
] as const;

export const homeActionTargets = {
  logo: ROUTES.home,
  nav: [
    { key: 'home', to: ROUTES.home },
    { key: 'guide', to: ROUTES.about },
    { key: 'calendar', to: ROUTES.calendar },
    { key: 'report', to: ROUTES.report },
  ],
  ctas: homeCtas,
  footerLinks: ['terms', 'privacy', 'cookies'],
  socialLinks: ['kakao', 'discord'],
} as const;