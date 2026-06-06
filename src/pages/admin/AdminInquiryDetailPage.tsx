import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getAdminInquiry,
  getAdminProfiles,
  updateAdminInquiry,
  type AdminInquiryDetail,
  type AdminProfileOption,
  type UpdateAdminInquiryInput,
} from '../../features/report/report.api';
import { Dropdown, type DropdownOptionData } from '../../shared/components/dropdown';
import { Footer } from '../../shared/components/layout/Footer';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { InputField } from '../../shared/components/input-field';
import { colors } from '../../shared/styles/tokens/colors';
import { inquiryTypeOptions } from '../report/reportConfig';
import styles from './AdminInquiryDetailPage.module.css';

type PageStatus = 'loading' | 'ready' | 'saving' | 'error' | 'success';
type FormErrors = Partial<Record<'handledBy' | 'status' | 'adminNote', string>>;

const categoryLabelMap = new Map(inquiryTypeOptions.map((option) => [option.value, option.label]));

const statusOptions: DropdownOptionData[] = [
  { value: 'rejected', label: '처리 불가' },
  { value: 'resolved', label: '처리 완료' },
  { value: 'reviewing', label: '처리 중' },
];

const statusLabelMap: Record<AdminInquiryDetail['status'], string> = {
  submitted: '접수 완료',
  reviewing: '처리 중',
  resolved: '처리 완료',
  rejected: '처리 불가',
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

function normalizeStatus(status: AdminInquiryDetail['status']) {
  return status === 'submitted' ? '' : status;
}

function hasFormErrors(errors: FormErrors) {
  return Object.values(errors).some(Boolean);
}

export function AdminInquiryDetailPage() {
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<AdminInquiryDetail | null>(null);
  const [admins, setAdmins] = useState<AdminProfileOption[]>([]);
  const [handledBy, setHandledBy] = useState('');
  const [processStatus, setProcessStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      if (!inquiryId) {
        setPageStatus('error');
        setMessage('문의 ID를 확인할 수 없습니다.');
        return;
      }

      try {
        setPageStatus('loading');
        const [nextInquiry, nextAdmins] = await Promise.all([
          getAdminInquiry(inquiryId),
          getAdminProfiles(),
        ]);

        if (isMounted) {
          setInquiry(nextInquiry);
          setAdmins(nextAdmins);
          setHandledBy(nextInquiry.handledBy);
          setProcessStatus(normalizeStatus(nextInquiry.status));
          setAdminNote(nextInquiry.adminNote);
          setPageStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setPageStatus('error');
          setMessage(error instanceof Error ? error.message : '문의 상세 정보를 불러오지 못했습니다.');
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [inquiryId]);

  const adminOptions = useMemo<DropdownOptionData[]>(
    () => admins.map((admin) => ({ value: admin.id, label: admin.nickname })),
    [admins],
  );

  const pageStyle = {
    '--admin-detail-background': colors.background.default,
    '--admin-detail-text': colors.text.primary,
    '--admin-detail-muted': colors.text.tertiary,
    '--admin-detail-border': colors.border.strong,
    '--admin-detail-button': colors.brand.primary,
    '--admin-detail-button-text': colors.text.onPrimary,
    '--admin-detail-error': colors.semantic.error,
  } as CSSProperties;

  const dropdownStyle = {
    '--dropdown-trigger-min-height': '46px',
    '--dropdown-trigger-padding-x': '16px',
    '--dropdown-option-min-height': '44px',
    '--dropdown-option-padding-x': '16px',
    '--dropdown-label': colors.text.primary,
    '--dropdown-text': colors.text.primary,
    '--dropdown-placeholder': colors.text.primaryAlpha40,
    '--dropdown-outline': colors.border.strong,
    '--dropdown-icon': colors.border.strong,
    '--dropdown-trigger-background': 'transparent',
    '--dropdown-menu-background': colors.background.default,
    '--dropdown-option-background': colors.background.subtle,
  } as CSSProperties;

  const inputRootStyle = {
    '--input-label': colors.text.primary,
    '--input-text': colors.text.primary,
    '--input-placeholder': colors.text.primaryAlpha40,
    '--input-border': colors.border.strong,
    '--input-border-active': colors.border.strong,
    '--input-control-background': 'transparent',
    '--input-element-background': 'transparent',
    '--input-control-min-height-outlined': '48px',
    '--input-padding-outlined': '12px 0',
    '--input-outlined-padding-x': '16px',
    '--input-font-size': '16px',
    '--input-line-height': '1.35',
    '--input-message-error': colors.semantic.error,
  } as CSSProperties;

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!handledBy) {
      nextErrors.handledBy = '조치 담당자를 선택해주세요.';
    }

    if (!processStatus) {
      nextErrors.status = '처리 상태를 선택해주세요.';
    }

    if (!adminNote.trim()) {
      nextErrors.adminNote = '조치 내용을 입력해주세요.';
    }

    setErrors(nextErrors);
    return nextErrors;
  }

  function clearError(field: keyof FormErrors) {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });

    if (pageStatus === 'success' || pageStatus === 'error') {
      setPageStatus('ready');
      setMessage('');
    }
  }

  function handleAdminNoteChange(event: ChangeEvent<HTMLInputElement>) {
    setAdminNote(event.target.value);
    clearError('adminNote');
  }

  async function handleSave() {
    if (!inquiry) {
      return;
    }

    const nextErrors = validateForm();

    if (hasFormErrors(nextErrors)) {
      setPageStatus('ready');
      setMessage('필수 항목을 모두 입력해주세요.');
      return;
    }

    setPageStatus('saving');
    setMessage('');

    try {
      await updateAdminInquiry({
        id: inquiry.id,
        handledBy,
        status: processStatus as UpdateAdminInquiryInput['status'],
        adminNote,
      });

      setInquiry((currentInquiry) => currentInquiry
        ? {
            ...currentInquiry,
            handledBy,
            status: processStatus as AdminInquiryDetail['status'],
            adminNote,
          }
        : currentInquiry);
      setPageStatus('success');
      setMessage('문의 처리 상태를 저장했습니다.');
    } catch (error) {
      setPageStatus('error');
      setMessage(error instanceof Error ? error.message : '문의 처리 상태 저장에 실패했습니다.');
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle}>
          <div className={styles.inner}>
            {pageStatus === 'loading' ? (
              <p className={styles.message}>문의 상세 정보를 불러오는 중입니다.</p>
            ) : null}

            {pageStatus !== 'loading' && inquiry ? (
              <>
                <header className={styles.header}>
                  <div className={styles.titleGroup}>
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={() => navigate(-1)}
                      aria-label="문의 목록으로 돌아가기"
                    >
                      ‹
                    </button>
                    <h1 className={styles.title}>{inquiry.subject}</h1>
                  </div>
                  <div className={styles.meta}>
                    <span>{inquiry.nickname}</span>
                    <span>{formatDate(inquiry.createdAt)}</span>
                  </div>
                </header>

                <p className={styles.summary}>
                  <span>{statusLabelMap[inquiry.status]}</span>
                  <span aria-hidden="true">•</span>
                  <span>{categoryLabelMap.get(inquiry.category) ?? inquiry.category}</span>
                </p>

                <p className={styles.content}>{inquiry.message}</p>

                <hr className={styles.divider} />

                <section className={styles.actionForm} aria-label="문의 처리 입력">
                  <div className={styles.formRow}>
                    <Dropdown
                      label="조치 담당자"
                      options={adminOptions}
                      value={handledBy}
                      onChange={(value) => {
                        setHandledBy(value);
                        clearError('handledBy');
                      }}
                      placeholder="조치 담당자 선택"
                      invalid={Boolean(errors.handledBy)}
                      helperText={errors.handledBy}
                      rootStyle={dropdownStyle}
                      disabled={pageStatus === 'saving'}
                    />
                    <Dropdown
                      label="처리 상태"
                      options={statusOptions}
                      value={processStatus}
                      onChange={(value) => {
                        setProcessStatus(value);
                        clearError('status');
                      }}
                      placeholder="처리 상태 선택"
                      invalid={Boolean(errors.status)}
                      helperText={errors.status}
                      rootStyle={dropdownStyle}
                      disabled={pageStatus === 'saving'}
                    />
                  </div>

                  <InputField
                    label="조치 내용"
                    value={adminNote}
                    onChange={handleAdminNoteChange}
                    placeholder="조치 내용을 입력해주세요."
                    variant={errors.adminNote ? 'error' : 'outlined'}
                    message={errors.adminNote}
                    multiline
                    rows={2}
                    rootStyle={inputRootStyle}
                    disabled={pageStatus === 'saving'}
                  />

                  {message ? (
                    <p
                      className={pageStatus === 'error' ? styles.errorMessage : styles.statusMessage}
                      role={pageStatus === 'error' ? 'alert' : 'status'}
                    >
                      {message}
                    </p>
                  ) : null}

                  <div className={styles.saveRow}>
                    <button
                      type="button"
                      className={styles.saveButton}
                      onClick={() => void handleSave()}
                      disabled={pageStatus === 'saving'}
                    >
                      {pageStatus === 'saving' ? '저장 중' : '저장'}
                    </button>
                  </div>
                </section>
              </>
            ) : null}

            {pageStatus === 'error' && !inquiry ? (
              <p className={styles.message} role="alert">{message}</p>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
