import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';

import { Dropdown } from '../../shared/components/dropdown';
import { InputField } from '../../shared/components/input-field';
import { PageShell } from '../../shared/components/layout/PageShell';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { colors } from '../../shared/styles/tokens/colors';
import {
  clearInquiryDraft,
  getInquiryDraft,
  saveInquiryDraft,
  submitInquiry,
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

export function ReportPage() {
  const [formData, setFormData] = useState<InquiryFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<InquiryFieldErrors>({});
  const [pageStatus, setPageStatus] = useState<InquiryPageStatus>('booting');
  const [modalState, setModalState] = useState<InquiryModalState>(null);
  const [pendingDraft, setPendingDraft] = useState<InquiryDraftData | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

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
      await submitInquiry(formData);
      await handleClearDraftBeforeSubmit();
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
