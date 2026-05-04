import { colors } from '../../shared/styles/tokens/colors';

export type GuideLeafSection = {
  id: string;
  title: string;
  body: string[];
};

export type GuideCategory = {
  id: string;
  title: string;
  sections: GuideLeafSection[];
};

export type GuideDocument = {
  id: string;
  title: string;
  categories: GuideCategory[];
};

export type GuideTreeNode = {
  id: string;
  label: string;
  depth: 1 | 2 | 3;
  targetId?: string;
  children?: GuideTreeNode[];
};

export const pageTokens = {
  layout: {
    designViewport: {
      width: 1920,
      height: 1080,
    },
    sidebarWidth: 345,
    contentPaddingTop: 100,
    contentPaddingBottom: 100,
    contentPaddingInline: 150,
    pageInlinePadding: 0,
  },
  colors: {
    pageBackground: colors.background.default,
    sidebarBackground: colors.background.default,
    contentBackground: colors.background.default,
  },
} as const;

export const treeTokens = {
  maxDepth: 3,
  itemHeights: {
    1: 45,
    2: 45,
    3: 45,
  },
  indent: {
    1: 0,
    2: 20,
    3: 40,
  },
  iconSize: 22,
  itemPaddingX: 20,
  textSize: 16,
  state: {
    default: {
      background: colors.background.default,
      border: colors.border.default,
      text: colors.text.primary,
    },
    hover: {
      background: colors.background.secondary,
      border: colors.border.strong,
      text: colors.text.primary,
    },
    pressed: {
      background: colors.background.tertiary,
      border: colors.border.strong,
      text: colors.text.primary,
    },
    activeParent: {
      background: colors.background.elevated,
      border: colors.accent.rose,
      text: colors.brand.primary,
    },
    activeLeaf: {
      background: colors.accent.roseSoft,
      border: colors.accent.rose,
      text: colors.brand.primary,
    },
  },
} as const;

export const contentTokens = {
  heading1: {
    fontSize: 26,
    fontWeight: 600,
  },
  heading2: {
    fontSize: 18,
    fontWeight: 600,
  },
  heading3: {
    fontSize: 16,
    fontWeight: 400,
  },
  sectionGap: 55,
  editButton: {
    width: 100,
    height: 40,
    radius: 5,
    borderColor: colors.border.strong,
  },
  editor: {
    splitGap: 24,
    panelPadding: 24,
    minHeight: 520,
    borderColor: colors.border.default,
    background: colors.background.elevated,
    textareaBackground: colors.background.default,
    toolbarGap: 8,
    toolbarButtonHeight: 36,
    toolbarButtonMinWidth: 36,
    controlRadius: 6,
  },
} as const;

export const permissionMockConfig = {
  isAdmin: true,
  editLabel: '편집',
} as const;

export const guideDocuments: GuideDocument[] = [
  {
    id: 'chat-room-guide',
    title: '채팅방 이용',
    categories: [
      {
        id: 'chat-room-basic',
        title: '기본 원칙',
        sections: [
          {
            id: 'chat-room-basic-introduction',
            title: '기본 원칙',
            body: [
              "'도마소와 친구들 방탈출' 채팅방은 19세 이상 성인만 참여 가능한 친목 오픈 채팅방입니다.",
              '톡방의 안내는 실제 운영 정책으로 교체될 수 있도록 mock 문장으로 구성되어 있습니다.',
            ],
          },
          {
            id: 'chat-room-basic-profile',
            title: '프로필',
            body: [
              '닉네임 형식은 닉네임/방/실명여부 순서를 기본으로 사용합니다.',
              '중복되는 닉네임은 운영진 안내에 따라 조정될 수 있습니다.',
            ],
          },
        ],
      },
      {
        id: 'chat-room-account',
        title: '계정',
        sections: [
          {
            id: 'chat-room-account-signup',
            title: '회원가입',
            body: [
              '회원가입 시 닉네임, 아이디, 비밀번호는 필수이며 기타 정보는 선택 입력으로 관리합니다.',
            ],
          },
          {
            id: 'chat-room-account-login',
            title: '로그인',
            body: [
              '로그인 페이지는 추후 실제 인증 API와 연결될 예정이며, 현재는 구조만 먼저 설계되어 있습니다.',
            ],
          },
          {
            id: 'chat-room-account-profile-edit',
            title: '정보수정',
            body: [
              '개인 프로필 정보는 운영 정책에 따라 수정 제한이 있을 수 있습니다.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'discord-guide',
    title: '디스코드 이용',
    categories: [
      {
        id: 'discord-entry',
        title: '입장 안내',
        sections: [
          {
            id: 'discord-entry-link',
            title: '참여 링크',
            body: [
              '초대 링크는 운영진 또는 공지된 채널을 통해서만 배포합니다.',
            ],
          },
          {
            id: 'discord-entry-rules',
            title: '음성 채널 예절',
            body: [
              '음성 채널 사용 시 타인의 플레이를 방해하지 않도록 배려가 필요합니다.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'community-policy',
    title: '커뮤니티 운영 원칙',
    categories: [
      {
        id: 'community-policy-report',
        title: '문의 및 제보',
        sections: [
          {
            id: 'community-policy-report-evidence',
            title: '증거 원칙',
            body: [
              '운영진은 증거가 제출된 사안에 한해 공식적인 제보 처리 절차를 진행합니다.',
            ],
          },
          {
            id: 'community-policy-report-response',
            title: '응답 범위',
            body: [
              '응답 시간과 처리 범위는 운영진의 상황과 정책 우선순위에 따라 달라질 수 있습니다.',
            ],
          },
        ],
      },
    ],
  },
];

export function buildGuideTree(documents: GuideDocument[]): GuideTreeNode[] {
  return documents.map((document) => ({
    id: document.id,
    label: document.title,
    depth: 1,
    children: document.categories.map((category) => ({
      id: category.id,
      label: category.title,
      depth: 2,
      children: category.sections.map((section) => ({
        id: section.id,
        label: section.title,
        depth: 3,
        targetId: section.id,
      })),
    })),
  }));
}

export const guideTreeData = buildGuideTree(guideDocuments);