import {
  Footer as FooterRoot,
  type FooterMetaItem,
  type FooterNoticeItem,
  type FooterPolicyLink,
  type FooterSocialLink,
} from '../footer';

const assetBasePath = import.meta.env.BASE_URL;

const policyLinks: FooterPolicyLink[] = [
  { key: 'terms', label: '서비스 이용약관', href: '#' },
  { key: 'privacy', label: '개인정보 처리방침', href: '#' },
  { key: 'cookies', label: '쿠키 설정', href: '#' },
];

const notices: FooterNoticeItem[] = [
  {
    key: 'community',
    text: '카카오톡 오픈채팅 <방탈출 미식 협회> 운영 커뮤니티',
  },
  {
    key: 'support',
    text: '※ 카카오톡 오픈채팅방 운영을 위한 안내 및 관리 지원 사이트입니다.',
  },
];

const metaItems: FooterMetaItem[] = [
  { key: 'copyright', label: '© 2026 옥. All rights reserved.' },
  { key: 'contact', label: '개발자 문의 바로가기', href: 'https://open.kakao.com/o/s024KwFh' },
];

const socialLinks: FooterSocialLink[] = [
  {
    key: 'kakao',
    label: '카카오톡 채널',
    href: 'https://open.kakao.com/o/gVxKnbqi',
    ariaLabel: '카카오톡 채널 바로가기',
    imageSrc: `${assetBasePath}assets/icons/social/kakao.png`,
    imageAlt: '카카오톡 아이콘',
  },
  {
    key: 'discord',
    label: '디스코드',
    href: '#',
    ariaLabel: '디스코드 바로가기',
    imageSrc: `${assetBasePath}assets/icons/social/discord.png`,
    imageAlt: '디스코드 아이콘',
  },
];

export function Footer() {
  return (
    <FooterRoot
      policyLinks={policyLinks}
      notices={notices}
      metaItems={metaItems}
      socialLinks={socialLinks}
      socialTitle="<방탈출 미식 협회> SNS 바로가기"
    />
  );
}