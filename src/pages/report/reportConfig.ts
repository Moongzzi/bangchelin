import type { DropdownOptionData } from '../../shared/components/dropdown';

export type InquiryCategory = 'service' | 'incident' | 'suggestion' | 'other';

export type InquiryFormData = {
  category: string;
  subject: string;
  message: string;
};

export type InquiryDraftData = InquiryFormData & {
  updatedAt: string;
};

export type InquiryFieldErrors = Partial<Record<keyof InquiryFormData, string>>;
export type InquiryModalState = 'draft-restore' | 'draft-saved' | 'submit-complete' | null;
export type InquiryPageStatus =
  | 'booting'
  | 'checking-draft'
  | 'awaiting-draft-decision'
  | 'editing'
  | 'saving-draft'
  | 'submitting'
  | 'error';

export const inquiryPageTokens = {
  topRow: {
    height: 50,
    nicknameWidth: 320,
    categoryWidth: 320,
    gap: 50,
  },
  formCard: {
    width: 652,
    height: 610,
    radius: 5,
    padding: 20,
  },
  fields: {
    subjectHeight: 50,
    messageHeight: 320,
  },
  actions: {
    width: 50,
    height: 20,
    minWidth: 50,
    gap: 8,
    radius: 3,
  },
  page: {
    topPadding: 100,
    bottomPadding: 88,
    titleGap: 50,
    formGap: 50,
    contentWidth: 690,
  },
} as const;

export const inquiryModalTokens = {
  maxWidth: 366,
  cancelLabel: '취소',
  confirmLabel: '확인',
  singleConfirmLabel: '확인',
  restore: {
    title: '작성 중이던 내용 불러오기',
    description: '임시 저장된 내용이 있습니다.\n불러오시겠습니까?',
  },
  saved: {
    title: '임시 저장 완료',
    description: '작성중이던 내용을 임시 저장하였습니다.',
  },
  submitted: {
    title: '전송 완료',
    description: '작성하신 문의를 전송하였습니다.\n문의가 처리되기까지는 시간이\n소요될 수 있습니다.',
  },
} as const;

export const inquiryFormConfig = {
  subjectMaxLength: 20,
  messageMaxLength: 1000,
} as const;

export const inquiryDraftMockConfig = {
  mockUserKey: 'bangchelin-report-demo-user',
  hasStoredDraftOnLoad: true,
  networkDelayMs: 200,
  seedDraft: {
    category: 'other',
    subject: '저장된 문의 제목',
    message: '이전에 작성하던 문의 내용이 임시 저장되어 있습니다.',
    updatedAt: '2026-05-22T09:00:00.000Z',
  },
} satisfies {
  mockUserKey: string;
  hasStoredDraftOnLoad: boolean;
  networkDelayMs: number;
  seedDraft: InquiryDraftData;
};

export const inquiryTypeOptions: DropdownOptionData[] = [
  { value: 'service', label: '방슐랭 서비스 문의' },
  { value: 'incident', label: '사건/사고 제보' },
  { value: 'suggestion', label: '건의' },
  { value: 'other', label: '기타' },
];
