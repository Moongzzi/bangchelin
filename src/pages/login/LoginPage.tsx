import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { signInWithUsername } from '../../features/auth/auth.api';
import { InputField } from '../../shared/components/input-field';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { ROUTES } from '../../shared/constants/routes';
import { colors } from '../../shared/styles/tokens/colors';
import styles from './LoginPage.module.css';

type LoginFormValues = {
  username: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

type SubmissionState =
  | { kind: 'idle'; message: '' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string };

const initialFormValues: LoginFormValues = {
  username: '',
  password: '',
};

function validateLoginForm(values: LoginFormValues) {
  const errors: LoginFormErrors = {};

  if (!values.username.trim()) {
    errors.username = '아이디를 입력해주세요.';
  }

  if (!values.password.trim()) {
    errors.password = '비밀번호를 입력해주세요.';
  }

  return errors;
}

function hasValidationErrors(errors: LoginFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function LoginPage() {
  const assetBasePath = import.meta.env.BASE_URL;
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<LoginFormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    kind: 'idle',
    message: '',
  });

  const pageStyle = {
    '--login-background-image': `url(${assetBasePath}assets/images/login/background.png)`,
    '--login-panel-background-image': `url(${assetBasePath}assets/images/login/panelBackground.png)`,
    '--login-bg-start': colors.brand.primaryPressed,
    '--login-bg-mid': colors.brand.primaryHover,
    '--login-bg-end': colors.brand.primary,
    '--login-card-background': colors.background.default,
    '--login-form-panel': colors.border.default,
    '--login-brand': colors.brand.primary,
    '--login-text': colors.brand.primary,
    '--login-button': colors.brand.primary,
    '--login-button-hover': colors.brand.primaryHover,
    '--login-button-text': colors.text.onPrimary,
    '--login-line': colors.text.primaryAlpha40,
    '--login-success': colors.semantic.success,
    '--login-error': colors.semantic.error,
  } as CSSProperties;

  const inputRootStyle = {
    '--input-label': colors.brand.primaryPressed,
    '--input-text': colors.brand.primaryPressed,
    '--input-placeholder': 'rgba(94, 19, 30, 0.38)',
    '--input-border': 'rgba(94, 19, 30, 0.42)',
    '--input-border-active': colors.brand.primaryPressed,
    '--input-clear-background': colors.brand.primary,
    '--input-clear-icon': colors.text.onPrimary,
    '--input-message-error': colors.semantic.error,
    '--input-message-success': colors.semantic.success,
    '--input-control-min-height-underline': '48px',
    '--input-control-min-height-minimal': '48px',
    '--input-font-size': '0.875rem',
    '--input-line-height': '1.2',
    '--input-padding-underline': '15px 0 14px',
    '--input-clear-offset': '38px',
  } as CSSProperties;

  function handleFieldChange(field: keyof LoginFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setFormValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));

      setFormErrors((currentErrors) => {
        if (!currentErrors[field]) {
          return currentErrors;
        }

        return {
          ...currentErrors,
          [field]: undefined,
        };
      });

      if (submissionState.kind !== 'idle') {
        setSubmissionState({ kind: 'idle', message: '' });
      }
    };
  }

  function handleFieldClear(field: keyof LoginFormValues) {
    return () => {
      setFormValues((currentValues) => ({
        ...currentValues,
        [field]: '',
      }));

      setFormErrors((currentErrors) => {
        if (!currentErrors[field]) {
          return currentErrors;
        }

        return {
          ...currentErrors,
          [field]: undefined,
        };
      });

      if (submissionState.kind !== 'idle') {
        setSubmissionState({ kind: 'idle', message: '' });
      }
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateLoginForm(formValues);
    setFormErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      setSubmissionState({
        kind: 'error',
        message: '아이디와 비밀번호를 모두 입력해주세요.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await signInWithUsername(formValues.username.trim(), formValues.password);

      setSubmissionState({
        kind: 'success',
        message: '로그인되었습니다.',
      });
      navigate(ROUTES.home);
    } catch (error) {
      setSubmissionState({
        kind: 'error',
        message: error instanceof Error ? error.message : '로그인에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginErrorActions: PopupAction[] = [
    {
      label: '확인',
      variant: 'filled',
      onClick: () => setSubmissionState({ kind: 'idle', message: '' }),
    },
  ];

  return (
    <>
      <main className={styles.page} style={pageStyle}>
        <section className={styles.viewport} aria-labelledby="login-page-title">
          <div className={styles.card}>
            <Link to={ROUTES.home} className={styles.brandLink} aria-label="Bangchelin Guide home">
              <img src={`${assetBasePath}logo.png`} alt="" className={styles.brandImage} />
              <span className={styles.brandText}>BANGCHELIN GUIDE</span>
            </Link>

            <div className={styles.content}>
              <h1 id="login-page-title" className={styles.title}>
                BANGCHELIN
              </h1>

              <div className={styles.formPanel}>
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <div className={styles.fields}>
                    <InputField
                      id="login-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      label="아이디"
                      placeholder="아이디 입력"
                      variant={formErrors.username ? 'error' : 'default'}
                      value={formValues.username}
                      onChange={handleFieldChange('username')}
                      showClearButton
                      onClear={handleFieldClear('username')}
                      message={formErrors.username}
                      hideLabel
                      className={styles.field}
                      rootStyle={inputRootStyle}
                    />
                    <InputField
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      label="비밀번호"
                      placeholder="비밀번호 입력"
                      variant={formErrors.password ? 'error' : 'default'}
                      value={formValues.password}
                      onChange={handleFieldChange('password')}
                      showClearButton
                      onClear={handleFieldClear('password')}
                      message={formErrors.password}
                      hideLabel
                      className={styles.field}
                      rootStyle={inputRootStyle}
                    />
                  </div>

                  <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                    {isSubmitting ? '로그인 중...' : 'Log In'}
                  </button>
                </form>
              </div>

              <Link to={ROUTES.register} className={styles.signUpLink}>
                Sign Up
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Popup
        open={submissionState.kind === 'error'}
        onClose={() => setSubmissionState({ kind: 'idle', message: '' })}
        title="로그인 실패"
        description={submissionState.message}
        actions={loginErrorActions}
        role="alertdialog"
        maxWidth={366}
      />
    </>
  );
}
