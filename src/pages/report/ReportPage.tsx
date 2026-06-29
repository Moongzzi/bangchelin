import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';

import { Dropdown } from '../../shared/components/dropdown';
import { InputField } from '../../shared/components/input-field';
import { PageShell } from '../../shared/components/layout/PageShell';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { colors } from '../../shared/styles/tokens/colors';
import {
  clearInquiryDraft,
  getInquiryDraft,
  getMyInquiries,
  getMyInquiry,
  saveInquiryDraft,
  submitInquiry,
  type MyInquiryDetail,
  type MyInquiryListItem,
} from '../../features/report/report.api';
import {
  inquiryFormConfig,
  inquiryModalTokens,
  inquiryPageTokens,
  inquiryTypeOptions,
  type InquiryDraftData,
  type InquiryFieldErrors,
  type InquiryFormData,
  type InquiryModalState,
  type InquiryPageStatus,
} from './reportConfig';
import styles from './ReportPage.module.css';

const initialFormData: InquiryFormData = {
  category: '',
  subject: '',
  message: '',
};

type InquiryViewMode = 'write' | 'history';
type InquiryListStatus = 'loading' | 'ready' | 'error';
type InquiryDetailStatus = 'idle' | 'loading' | 'ready' | 'error';

const categoryLabelMap = new Map(inquiryTypeOptions.map((option) => [option.value, option.label]));

const statusLabelMap: Record<MyInquiryListItem['status'], string> = {
  submitted: '접수 완료',
  reviewing: '처리 중',
  resolved: '처리 완료',
  rejected: '반려',
};

function validateInquiryForm(formData: InquiryFormData): InquiryFieldErrors {
  const nextErrors: InquiryFieldErrors = {};

  if (!formData.category) {
    nextErrors.category = '문의 종류를 선택해주세요.';
  }

  if (!formData.subject.trim()) {
    nextErrors.subject = '문의 제목을 입력해주세요.';
  } else if (formData.subject.length > inquiryFormConfig.subjectMaxLength) {
    nextErrors.subject = `제목은 ${inquiryFormConfig.subjectMaxLength}자 이내여야 합니다.`;
  }

  if (!formData.message.trim()) {
    nextErrors.message = '문의 내용을 입력해주세요.';
  } else if (formData.message.length > inquiryFormConfig.messageMaxLength) {
    nextErrors.message = `문의 내용은 ${inquiryFormConfig.messageMaxLength}자 이내여야 합니다.`;
  }

  return nextErrors;
}

function hasFieldErrors(errors: InquiryFieldErrors) {
  return Object.values(errors).some(Boolean);
}

function getInputVariant(error?: string) {
  return error ? 'error' : 'default';
}

function formatInquiryDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

export function ReportPage() {
  const [formData, setFormData] = useState<InquiryFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<InquiryFieldErrors>({});
  const [pageStatus, setPageStatus] = useState<InquiryPageStatus>('booting');
  const [modalState, setModalState] = useState<InquiryModalState>(null);
  const [pendingDraft, setPendingDraft] = useState<InquiryDraftData | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [viewMode, setViewMode] = useState<InquiryViewMode>('write');
  const [myInquiries, setMyInquiries] = useState<MyInquiryListItem[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<MyInquiryDetail | null>(null);
  const [listStatus, setListStatus] = useState<InquiryListStatus>('loading');
  const [detailStatus, setDetailStatus] = useState<InquiryDetailStatus>('idle');
  const [listErrorMessage, setListErrorMessage] = useState('');
  const [detailErrorMessage, setDetailErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function hydrateDraft() {
      try {
        setPageStatus('checking-draft');
        const existingDraft = await getInquiryDraft();

        if (!isMounted) {
          return;
        }

        if (existingDraft) {
          setPendingDraft(existingDraft);
          setModalState('draft-restore');
          setPageStatus('awaiting-draft-decision');
          return;
        }

        setPageStatus('editing');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedbackMessage(error instanceof Error ? error.message : '임시 저장 내용을 확인하지 못했습니다.');
        setPageStatus('error');
      }
    }

    void hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMyInquiries() {
      try {
        setListStatus('loading');
        const nextInquiries = await getMyInquiries();

        if (!isMounted) {
          return;
        }

        setMyInquiries(nextInquiries);
        setListStatus('ready');

        if (nextInquiries[0]) {
          setSelectedInquiryId(nextInquiries[0].id);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setListErrorMessage(error instanceof Error ? error.message : '내 문의 목록을 불러오지 못했습니다.');
        setListStatus('error');
      }
    }

    void loadMyInquiries();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedInquiry() {
      if (!selectedInquiryId) {
        setSelectedInquiry(null);
        setDetailStatus('idle');
        return;
      }

      try {
        setDetailStatus('loading');
        setDetailErrorMessage('');
        const nextInquiry = await getMyInquiry(selectedInquiryId);

        if (!isMounted) {
          return;
        }

        setSelectedInquiry(nextInquiry);
        setDetailStatus('ready');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSelectedInquiry(null);
        setDetailErrorMessage(error instanceof Error ? error.message : '문의 상세 내용을 불러오지 못했습니다.');
        setDetailStatus('error');
      }
    }

    void loadSelectedInquiry();

    return () => {
      isMounted = false;
    };
  }, [selectedInquiryId]);

  const pageStyle = {
    '--inquiry-page-background': colors.background.default,
    '--inquiry-card-background': colors.background.elevated,
    '--inquiry-card-width': `${inquiryPageTokens.formCard.width}px`,
    '--inquiry-card-height': `${inquiryPageTokens.formCard.height}px`,
    '--inquiry-card-radius': `${inquiryPageTokens.formCard.radius}px`,
    '--inquiry-card-padding': `${inquiryPageTokens.formCard.padding}px`,
    '--inquiry-row-height': `${inquiryPageTokens.topRow.height}px`,
    '--inquiry-nickname-width': `${inquiryPageTokens.topRow.nicknameWidth}px`,
    '--inquiry-category-width': `${inquiryPageTokens.topRow.categoryWidth}px`,
    '--inquiry-title-height': `${inquiryPageTokens.fields.subjectHeight}px`,
    '--inquiry-textarea-height': `${inquiryPageTokens.fields.messageHeight}px`,
    '--inquiry-text-color': colors.text.primary,
    '--inquiry-muted-color': colors.text.tertiary,
    '--inquiry-border-color': colors.border.strong,
    '--inquiry-button-primary': colors.brand.primary,
    '--inquiry-button-primary-text': colors.text.onPrimary,
    '--inquiry-button-secondary-text': colors.text.tertiary,
    '--inquiry-button-gap': `${inquiryPageTokens.actions.gap}px`,
    '--inquiry-button-width': `${inquiryPageTokens.actions.width}px`,
    '--inquiry-button-height': `${inquiryPageTokens.actions.height}px`,
    '--inquiry-button-radius': `${inquiryPageTokens.actions.radius}px`,
    '--inquiry-modal-max-width': `${inquiryModalTokens.maxWidth}px`,
    '--inquiry-page-top-padding': `${inquiryPageTokens.page.topPadding}px`,
    '--inquiry-page-bottom-padding': `${inquiryPageTokens.page.bottomPadding}px`,
    '--inquiry-page-width': `${inquiryPageTokens.page.contentWidth}px`,
    '--inquiry-title-gap': `${inquiryPageTokens.page.titleGap}px`,
    '--inquiry-form-gap': `${inquiryPageTokens.page.formGap}px`,
    '--inquiry-top-row-gap': `${inquiryPageTokens.topRow.gap}px`,
  } as CSSProperties;

  const inputRootStyle = {
    '--input-label': colors.text.primary,
    '--input-text': colors.text.primary,
    '--input-placeholder': colors.text.primaryAlpha40,
    '--input-border': colors.accent.navy,
    '--input-border-active': colors.accent.navyHover,
    '--input-control-background': colors.background.default,
    '--input-element-background': colors.background.default,
    '--input-clear-background': colors.brand.primary,
    '--input-clear-icon': colors.text.onPrimary,
    '--input-message-error': colors.semantic.error,
    '--input-control-min-height-underline': `${inquiryPageTokens.topRow.height}px`,
    '--input-font-size': '0.875rem',
    '--input-line-height': '1.25',
    '--input-padding-underline': '15px 0 14px',
  } as CSSProperties;

  const textAreaRootStyle = {
    ...inputRootStyle,
    '--input-control-background': colors.background.elevated,
    '--input-element-background': colors.background.elevated,
    '--input-control-min-height-outlined': `${inquiryPageTokens.fields.messageHeight}px`,
    '--input-padding-outlined': '12px 14px',
    '--input-outlined-padding-x': '0px',
    '--input-textarea-height': '100%',
    '--input-textarea-min-height': '100%',
    '--input-textarea-align-self': 'stretch',
    '--input-textarea-resize': 'none',
  } as CSSProperties;

  const cardInputRootStyle = {
    ...inputRootStyle,
    '--input-control-background': colors.background.elevated,
    '--input-element-background': colors.background.elevated,
  } as CSSProperties;

  const isBusy = pageStatus === 'checking-draft' || pageStatus === 'saving-draft' || pageStatus === 'submitting';
  const isFormLocked = pageStatus === 'awaiting-draft-decision' || pageStatus === 'checking-draft';

  const helperText = useMemo(
    () => ({
      subject: `${formData.subject.length}/${inquiryFormConfig.subjectMaxLength}`,
      message: `${formData.message.length}/${inquiryFormConfig.messageMaxLength}`,
    }),
    [formData.message, formData.subject],
  );

  function updateField<K extends keyof InquiryFormData>(field: K, value: InquiryFormData[K]) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });
  }

  function handleInputChange(field: keyof InquiryFormData) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateField(field, event.target.value);
    };
  }

  function handleMessageChange(event: ChangeEvent<HTMLInputElement>) {
    updateField('message', event.target.value);
  }

  function handleDismissDraftRestore() {
    setPendingDraft(null);
    setModalState(null);
    setFeedbackMessage('');
    setPageStatus('editing');

    void clearInquiryDraft().catch((error) => {
      console.warn('Failed to clear inquiry draft after dismissing restore popup.', error);
    });
  }

  async function handleClearDraftBeforeSubmit() {
    try {
      await clearInquiryDraft();
    } catch (error) {
      console.warn('Failed to clear inquiry draft after submitting inquiry.', error);
    }
  }

  function handleRestoreDraft() {
    if (!pendingDraft) {
      void handleDismissDraftRestore();
      return;
    }

    setFormData({
      category: pendingDraft.category,
      subject: pendingDraft.subject,
      message: pendingDraft.message,
    });
    setFieldErrors({});
    setFeedbackMessage('임시 저장된 내용을 불러왔습니다.');
    setPendingDraft(null);
    setModalState(null);
    setPageStatus('editing');
  }

  async function handleSaveDraft() {
    const nextErrors = validateInquiryForm(formData);
    setFieldErrors(nextErrors);

    if (hasFieldErrors(nextErrors)) {
      return;
    }

    setPageStatus('saving-draft');

    try {
      await saveInquiryDraft(formData);
      setFeedbackMessage('작성중이던 내용을 임시 저장하였습니다.');
      setModalState('draft-saved');
      setPageStatus('editing');
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : '임시 저장에 실패했습니다.');
      setPageStatus('error');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateInquiryForm(formData);
    setFieldErrors(nextErrors);

    if (hasFieldErrors(nextErrors)) {
      return;
    }

    setPageStatus('submitting');
    try {
      const submittedInquiry = await submitInquiry(formData);
      await handleClearDraftBeforeSubmit();
      const nextInquiries = await getMyInquiries();
      setMyInquiries(nextInquiries);
      setSelectedInquiryId(submittedInquiry.id);
      setListStatus('ready');
      setViewMode('history');
      setFeedbackMessage('작성하신 문의를 전송하였습니다. 문의가 처리되기까지는 시간이 소요될 수 있습니다.');
      setFormData(initialFormData);
      setModalState('submit-complete');
      setPageStatus('editing');
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : '문의 전송에 실패했습니다.');
      setPageStatus('error');
    }
  }

  const restoreActions: PopupAction[] = [
    {
      label: inquiryModalTokens.cancelLabel,
      variant: 'text',
      tone: 'neutral',
      onClick: handleDismissDraftRestore,
    },
    {
      label: inquiryModalTokens.confirmLabel,
      variant: 'outline',
      onClick: handleRestoreDraft,
    },
  ];

  const draftSavedActions: PopupAction[] = [
    {
      label: inquiryModalTokens.singleConfirmLabel,
      variant: 'filled',
      onClick: () => setModalState(null),
    },
  ];

  const submitCompleteActions: PopupAction[] = [
    {
      label: inquiryModalTokens.singleConfirmLabel,
      variant: 'filled',
      onClick: () => setModalState(null),
    },
  ];

  return (
    <PageShell>
      <section className={styles.page} style={pageStyle} aria-busy={isBusy}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.title}>문의하기</h1>
          </header>

          <div className={styles.viewTabs} role="tablist" aria-label="문의 화면 선택">
            <button
              type="button"
              className={viewMode === 'write' ? styles.activeTab : styles.tab}
              onClick={() => setViewMode('write')}
              aria-selected={viewMode === 'write'}
              role="tab"
            >
              문의 작성
            </button>
            <button
              type="button"
              className={viewMode === 'history' ? styles.activeTab : styles.tab}
              onClick={() => setViewMode('history')}
              aria-selected={viewMode === 'history'}
              role="tab"
            >
              내 문의
            </button>
          </div>

          {viewMode === 'write' ? (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.card}>
                <div className={styles.cardFields}>
                  <Dropdown
                    label="문의 종류"
                    options={inquiryTypeOptions}
                    value={formData.category}
                    onChange={(value) => updateField('category', value)}
                    placeholder="문의 종류를 선택해주세요."
                    invalid={Boolean(fieldErrors.category)}
                    helperText={fieldErrors.category}
                    required
                    disabled={isFormLocked}
                    className={styles.cardDropdown}
                  />

                  <InputField
                    label="문의 제목"
                    value={formData.subject}
                    onChange={handleInputChange('subject')}
                    placeholder="제목을 입력해주세요."
                    variant={getInputVariant(fieldErrors.subject)}
                    message={fieldErrors.subject ?? helperText.subject}
                    messageType={fieldErrors.subject ? 'error' : 'helper'}
                    maxLength={inquiryFormConfig.subjectMaxLength}
                    required
                    disabled={isFormLocked}
                    rootStyle={cardInputRootStyle}
                    className={styles.subjectField}
                  />

                  <InputField
                    label="문의 내용"
                    value={formData.message}
                    onChange={handleMessageChange}
                    placeholder="문의 내용을 입력해주세요."
                    variant={fieldErrors.message ? 'error' : 'outlined'}
                    message={fieldErrors.message ?? helperText.message}
                    messageType={fieldErrors.message ? 'error' : 'helper'}
                    maxLength={inquiryFormConfig.messageMaxLength}
                    required
                    disabled={isFormLocked}
                    rootStyle={textAreaRootStyle}
                    className={styles.messageField}
                    multiline
                    rows={12}
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void handleSaveDraft()}
                    disabled={isBusy || isFormLocked}
                  >
                    임시 저장
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isBusy || isFormLocked}
                  >
                    보내기
                  </button>
                </div>
              </div>

              {feedbackMessage ? <p className={styles.feedback}>{feedbackMessage}</p> : null}
            </form>
          ) : (
            <section className={styles.historyPanel} aria-label="내 문의 목록">
              <div className={styles.historyList}>
                {listStatus === 'loading' ? (
                  <p className={styles.historyMessage}>내 문의 목록을 불러오는 중입니다.</p>
                ) : null}

                {listStatus === 'error' ? (
                  <p className={styles.historyMessage} role="alert">{listErrorMessage}</p>
                ) : null}

                {listStatus === 'ready' && myInquiries.length === 0 ? (
                  <p className={styles.historyMessage}>아직 작성한 문의가 없습니다.</p>
                ) : null}

                {myInquiries.map((inquiry) => (
                  <button
                    key={inquiry.id}
                    type="button"
                    className={selectedInquiryId === inquiry.id ? styles.activeInquiryItem : styles.inquiryItem}
                    onClick={() => setSelectedInquiryId(inquiry.id)}
                  >
                    <span className={styles.inquiryItemTop}>
                      <span>{categoryLabelMap.get(inquiry.category) ?? inquiry.category}</span>
                      <span className={styles.statusBadge}>{statusLabelMap[inquiry.status]}</span>
                    </span>
                    <strong>{inquiry.subject}</strong>
                    <span className={styles.inquiryDate}>{formatInquiryDate(inquiry.createdAt)}</span>
                  </button>
                ))}
              </div>

              <article className={styles.historyDetail} aria-live="polite">
                {detailStatus === 'idle' && listStatus === 'ready' && myInquiries.length === 0 ? (
                  <p className={styles.historyMessage}>문의가 접수되면 이곳에서 상태를 확인할 수 있습니다.</p>
                ) : null}

                {detailStatus === 'loading' ? (
                  <p className={styles.historyMessage}>문의 상세 내용을 불러오는 중입니다.</p>
                ) : null}

                {detailStatus === 'error' ? (
                  <p className={styles.historyMessage} role="alert">{detailErrorMessage}</p>
                ) : null}

                {detailStatus === 'ready' && selectedInquiry ? (
                  <>
                    <div className={styles.detailHeader}>
                      <p className={styles.detailMeta}>
                        {categoryLabelMap.get(selectedInquiry.category) ?? selectedInquiry.category}
                      </p>
                      <h2 className={styles.detailTitle}>{selectedInquiry.subject}</h2>
                      <p className={styles.detailMeta}>
                        접수일 {formatInquiryDate(selectedInquiry.createdAt)}
                      </p>
                    </div>

                    <dl className={styles.detailInfo}>
                      <div>
                        <dt>처리 상태</dt>
                        <dd>{statusLabelMap[selectedInquiry.status]}</dd>
                      </div>
                      <div>
                        <dt>최근 변경</dt>
                        <dd>{formatInquiryDate(selectedInquiry.updatedAt)}</dd>
                      </div>
                    </dl>

                    <section className={styles.detailSection}>
                      <h3>문의 내용</h3>
                      <p>{selectedInquiry.message}</p>
                    </section>

                    <section className={styles.detailSection}>
                      <h3>처리 내용</h3>
                      {selectedInquiry.adminNote ? (
                        <>
                          <p>{selectedInquiry.adminNote}</p>
                          {selectedInquiry.handledAt ? (
                            <span className={styles.inquiryDate}>
                              처리일 {formatInquiryDate(selectedInquiry.handledAt)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <p className={styles.historyMessage}>아직 등록된 처리 내용이 없습니다.</p>
                      )}
                    </section>
                  </>
                ) : null}
              </article>
            </section>
          )}
        </div>

        <Popup
          open={modalState === 'draft-restore'}
          onClose={handleDismissDraftRestore}
          title={inquiryModalTokens.restore.title}
          description={inquiryModalTokens.restore.description}
          actions={restoreActions}
          closeOnOverlayClick={false}
          closeOnEscape={false}
          preventScrollLock
          maxWidth={inquiryModalTokens.maxWidth}
        />

        <Popup
          open={modalState === 'draft-saved'}
          onClose={() => setModalState(null)}
          title={inquiryModalTokens.saved.title}
          description={inquiryModalTokens.saved.description}
          actions={draftSavedActions}
          preventScrollLock
          maxWidth={inquiryModalTokens.maxWidth}
        />

        <Popup
          open={modalState === 'submit-complete'}
          onClose={() => setModalState(null)}
          title={inquiryModalTokens.submitted.title}
          description={inquiryModalTokens.submitted.description}
          actions={submitCompleteActions}
          preventScrollLock
          maxWidth={inquiryModalTokens.maxWidth}
        />
      </section>
    </PageShell>
  );
}
