import type { ChangeEvent, CSSProperties, FocusEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { checkNicknameAvailable, signUp, type ActivityRegion } from '../../features/auth/auth.api';
import { InputField } from '../../shared/components/input-field';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { ROUTES } from '../../shared/constants/routes';
import { colors } from '../../shared/styles/tokens/colors';
import {
  authLayoutTokens,
  emailPattern,
  signupFormConfig,
  signupPageTokens,
} from './registerConfig';
import styles from './RegisterPage.module.css';

type RegisterFormValues = {
  nickname: string;
  username: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  introduction: string;
  region: string;
  email: string;
};

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

type StatusState = {
  kind: 'idle' | 'success' | 'error';
  message: string;
};

const initialFormValues: RegisterFormValues = {
  nickname: '',
  username: '',
  password: '',
  confirmPassword: '',
  birthDate: '',
  introduction: '',
  region: signupFormConfig.regions[0],
  email: '',
};

const regionValues: ActivityRegion[] = [
  'seoul',
  'incheon',
  'gyeonggi',
  'chungcheong',
  'gyeongsang',
  'jeolla',
  'gangwon',
  'jeju',
];

function getActivityRegion(label: string) {
  const index = signupFormConfig.regions.findIndex((region) => region === label);
  return regionValues[index] ?? null;
}

function validateRegisterForm(values: RegisterFormValues) {
  const errors: RegisterFormErrors = {};

  if (!values.nickname.trim()) {
    errors.nickname = '닉네임을 입력해주세요.';
  } else if (values.nickname.length > signupFormConfig.nicknameMaxLength) {
    errors.nickname = `닉네임은 ${signupFormConfig.nicknameMaxLength}자 이내여야 합니다.`;
  }

  if (!values.username.trim()) {
    errors.username = '아이디를 입력해주세요.';
  }

  if (!values.password) {
    errors.password = '비밀번호를 입력해주세요.';
  } else if (values.password.length < 6) {
    errors.password = '비밀번호는 6자 이상이어야 합니다.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해주세요.';
  } else if (values.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
  }

  if (values.introduction.length > signupFormConfig.introductionMaxLength) {
    errors.introduction = `한줄 소개는 ${signupFormConfig.introductionMaxLength}자 이내여야 합니다.`;
  }

  if (values.email.trim() && !emailPattern.test(values.email.trim())) {
    errors.email = '이메일 형식을 확인해주세요.';
  }

  return errors;
}

function hasErrors(errors: RegisterFormErrors) {
  return Object.values(errors).some(Boolean);
}

function getEmailError(email: string) {
  const trimmedEmail = email.trim();

  if (trimmedEmail && !emailPattern.test(trimmedEmail)) {
    return '이메일 형식을 확인해주세요.';
  }

  return undefined;
}

export function RegisterPage() {
  const assetBasePath = import.meta.env.BASE_URL;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formValues, setFormValues] = useState<RegisterFormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<StatusState>({ kind: 'idle', message: '' });
  const [nicknameStatus, setNicknameStatus] = useState<StatusState>({ kind: 'idle', message: '' });
  const [checkedNickname, setCheckedNickname] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl);
      }
    };
  }, [profilePreviewUrl]);

  const pageStyle = {
    '--register-background-image': `url(${assetBasePath}${authLayoutTokens.backgroundImagePath})`,
    '--register-card-width': `${authLayoutTokens.card.width}px`,
    '--register-card-height': `${authLayoutTokens.card.height}px`,
    '--register-card-radius': `${authLayoutTokens.card.radius}px`,
    '--register-card-background': colors.surface.default,
    '--register-brand-color': colors.brand.primary,
    '--register-brand-gap': `${authLayoutTokens.brand.gap}px`,
    '--register-brand-logo-size': `${authLayoutTokens.brand.logoSize}px`,
    '--register-brand-text-size': `${authLayoutTokens.brand.textSize}px`,
    '--register-divider-color': signupPageTokens.dividerColor,
    '--register-heading-color': colors.text.primary,
    '--register-label-color': colors.text.primary,
    '--register-muted-color': colors.text.secondary,
    '--register-input-color': colors.text.primary,
    '--register-placeholder-color': colors.text.primaryAlpha40,
    '--register-input-line': colors.accent.navy,
    '--register-select-border': colors.border.default,
    '--register-duplicate-outline': signupPageTokens.duplicateCheckBorderColor,
    '--register-profile-size': `${signupPageTokens.profileButtonSize}px`,
    '--register-profile-outline': colors.border.default,
    '--register-submit-width': `${signupPageTokens.submitButtonWidth}px`,
    '--register-submit-height': `${signupPageTokens.submitButtonHeight}px`,
    '--register-submit-radius': `${signupPageTokens.submitButtonRadius}px`,
    '--register-submit-background': colors.brand.primary,
    '--register-submit-background-hover': colors.brand.primaryHover,
    '--register-submit-text': colors.text.onPrimary,
    '--register-column-gap': `${signupPageTokens.columnGap}px`,
    '--register-input-width': `${signupPageTokens.inputWidth}px`,
    '--register-input-height': `${signupPageTokens.inputHeight}px`,
    '--register-top-offset': '42px',
    '--register-error-color': colors.semantic.error,
    '--register-success-color': colors.semantic.success,
  } as CSSProperties;

  const inputRootStyle = {
    '--input-label': colors.text.primary,
    '--input-text': colors.text.primary,
    '--input-placeholder': colors.text.primaryAlpha40,
    '--input-border': colors.accent.navy,
    '--input-border-active': colors.accent.navyHover,
    '--input-clear-background': colors.brand.primary,
    '--input-clear-icon': colors.text.onPrimary,
    '--input-message-error': colors.semantic.error,
    '--input-message-success': colors.semantic.success,
    '--input-control-min-height-underline': `${signupPageTokens.inputHeight}px`,
    '--input-control-min-height-minimal': `${signupPageTokens.inputHeight}px`,
    '--input-font-size': '0.875rem',
    '--input-line-height': '1.2',
    '--input-padding-underline': '15px 0 14px',
    '--input-clear-offset': '38px',
  } as CSSProperties;

  function updateField<K extends keyof RegisterFormValues>(field: K, value: RegisterFormValues[K]) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
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

    if (field === 'nickname' && nicknameStatus.kind !== 'idle') {
      setNicknameStatus({ kind: 'idle', message: '' });
      setCheckedNickname('');
    }

    if (submitStatus.kind !== 'idle') {
      setSubmitStatus({ kind: 'idle', message: '' });
    }
  }

  function handleInputChange(field: keyof RegisterFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateField(field, event.target.value);
    };
  }

  function handleTextAreaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    updateField('introduction', event.target.value);
  }

  function handleEmailBlur(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const nextEmailError = getEmailError(event.target.value);

    setFormErrors((currentErrors) => ({
      ...currentErrors,
      email: nextEmailError,
    }));
  }

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    updateField('region', event.target.value);
  }

  function handleFieldClear(field: keyof RegisterFormValues) {
    return () => updateField(field, '');
  }

  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    updateField('birthDate', event.target.value);
  }

  async function handleNicknameCheck() {
    const trimmedNickname = formValues.nickname.trim();

    if (!trimmedNickname) {
      setNicknameStatus({ kind: 'error', message: '닉네임을 먼저 입력해주세요.' });
      return;
    }

    if (trimmedNickname.length > signupFormConfig.nicknameMaxLength) {
      setNicknameStatus({ kind: 'error', message: '닉네임 형식을 먼저 맞춰주세요.' });
      return;
    }

    setNicknameStatus({ kind: 'idle', message: '확인 중입니다...' });

    try {
      const isAvailable = await checkNicknameAvailable(trimmedNickname);

      if (!isAvailable) {
        setCheckedNickname('');
        setNicknameStatus({ kind: 'error', message: '이미 사용 중인 닉네임입니다.' });
        return;
      }

      setCheckedNickname(trimmedNickname);
      setNicknameStatus({ kind: 'success', message: '사용 가능한 닉네임입니다.' });
    } catch (error) {
      setCheckedNickname('');
      setNicknameStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : '닉네임 중복 확인에 실패했습니다.',
      });
    }
  }

  function handleProfileButtonClick() {
    fileInputRef.current?.click();
  }

  function handleProfileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    setProfileFile(nextFile);
    setProfilePreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return URL.createObjectURL(nextFile);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateRegisterForm(formValues);
    setFormErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setSubmitStatus({ kind: 'error', message: '필수 입력값과 형식을 다시 확인해주세요.' });
      return;
    }

    if (checkedNickname !== formValues.nickname.trim()) {
      setNicknameStatus({ kind: 'error', message: '닉네임 중복 확인을 먼저 완료해주세요.' });
      setSubmitStatus({ kind: 'error', message: '닉네임 중복 확인이 필요합니다.' });
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp({
        username: formValues.username.trim(),
        password: formValues.password,
        email: formValues.email.trim(),
        nickname: formValues.nickname.trim(),
        avatarFile: profileFile,
        birthDate: formValues.birthDate,
        introduction: formValues.introduction,
        activityRegion: getActivityRegion(formValues.region),
      });

      navigate(ROUTES.login, { replace: true });
    } catch (error) {
      setSubmitStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : '회원가입에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitErrorActions: PopupAction[] = [
    {
      label: '확인',
      variant: 'filled',
      onClick: () => setSubmitStatus({ kind: 'idle', message: '' }),
    },
  ];

  return (
    <>
    <main className={styles.page} style={pageStyle}>
      <section className={styles.viewport} aria-labelledby="register-page-title">
        <div className={styles.card}>
          <Link to={ROUTES.home} className={styles.brandLink} aria-label="Bangchelin Guide home">
            <img src={`${assetBasePath}logo.png`} alt="" className={styles.brandImage} />
            <span className={styles.brandText}>BANGCHELIN GUIDE</span>
          </Link>

          <div className={styles.content}>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.columns}>
                <div className={styles.leftColumn}>
                  <h1 id="register-page-title" className={styles.heading}>
                    회원가입
                  </h1>
                  <p className={styles.requiredHint}>* 표시는 필수 입력입니다.</p>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>
                      닉네임 <span className={styles.requiredMark} aria-hidden="true">*</span>
                    </span>
                    <div className={styles.nicknameRow}>
                      <InputField
                        id="register-nickname"
                        name="nickname"
                        type="text"
                        label="닉네임"
                        placeholder="닉네임 입력"
                        variant={formErrors.nickname ? 'error' : 'default'}
                        value={formValues.nickname}
                        onChange={handleInputChange('nickname')}
                        showClearButton
                        onClear={handleFieldClear('nickname')}
                        hideLabel
                        className={styles.nicknameField}
                        rootStyle={inputRootStyle}
                        maxLength={signupFormConfig.nicknameMaxLength}
                        required
                      />
                      <button type="button" className={styles.duplicateButton} onClick={handleNicknameCheck}>
                        중복확인
                      </button>
                    </div>
                    <p
                      className={nicknameStatus.kind === 'success' ? styles.inlineSuccess : styles.inlineError}
                      role={nicknameStatus.kind === 'error' ? 'alert' : 'status'}
                    >
                      {formErrors.nickname ?? nicknameStatus.message}
                    </p>
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>
                      아이디 <span className={styles.requiredMark} aria-hidden="true">*</span>
                    </span>
                    <InputField
                      id="register-username"
                      name="username"
                      type="text"
                      label="아이디"
                      placeholder="아이디 입력"
                      variant={formErrors.username ? 'error' : 'default'}
                      value={formValues.username}
                      onChange={handleInputChange('username')}
                      showClearButton
                      onClear={handleFieldClear('username')}
                      hideLabel
                      className={styles.field}
                      rootStyle={inputRootStyle}
                      autoComplete="username"
                      required
                    />
                    <p className={styles.inlineError}>{formErrors.username ?? ''}</p>
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>
                      비밀번호 <span className={styles.requiredMark} aria-hidden="true">*</span>
                    </span>
                    <InputField
                      id="register-password"
                      name="password"
                      type="password"
                      label="비밀번호"
                      placeholder="비밀번호 입력"
                      variant={formErrors.password ? 'error' : 'default'}
                      value={formValues.password}
                      onChange={handleInputChange('password')}
                      showClearButton
                      onClear={handleFieldClear('password')}
                      hideLabel
                      className={styles.field}
                      rootStyle={inputRootStyle}
                      autoComplete="new-password"
                      required
                    />
                    <p className={styles.inlineError}>{formErrors.password ?? ''}</p>
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>
                      비밀번호 확인 <span className={styles.requiredMark} aria-hidden="true">*</span>
                    </span>
                    <InputField
                      id="register-confirm-password"
                      name="confirmPassword"
                      type="password"
                      label="비밀번호 확인"
                      placeholder="비밀번호 확인"
                      variant={formErrors.confirmPassword ? 'error' : 'default'}
                      value={formValues.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      showClearButton
                      onClear={handleFieldClear('confirmPassword')}
                      hideLabel
                      className={styles.field}
                      rootStyle={inputRootStyle}
                      autoComplete="new-password"
                      required
                    />
                    <p className={styles.inlineError}>{formErrors.confirmPassword ?? ''}</p>
                  </div>
                </div>

                <div className={styles.divider} aria-hidden="true" />

                <div className={styles.rightColumn}>
                  <div className={styles.topRow}>
                    <div className={styles.profileBlock}>
                      <button
                        type="button"
                        className={styles.profileButton}
                        onClick={handleProfileButtonClick}
                        aria-label="프로필 이미지 업로드"
                      >
                        {profilePreviewUrl ? (
                          <img src={profilePreviewUrl} alt="선택한 프로필 이미지" className={styles.profileImage} />
                        ) : (
                          <img
                            src={`${assetBasePath}${signupPageTokens.profileImagePath}`}
                            alt=""
                            className={styles.profileIcon}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfileChange}
                        className={styles.hiddenInput}
                      />
                    </div>

                    <div className={styles.dateBlock}>
                      <label htmlFor="register-birthDate" className={styles.nativeLabel}>
                        생일
                      </label>
                      <input
                        id="register-birthDate"
                        name="birthDate"
                        type="date"
                        value={formValues.birthDate}
                        onChange={handleDateChange}
                        className={styles.dateInput}
                      />
                    </div>
                  </div>

                  <div className={styles.introBlock}>
                    <div className={styles.introHeader}>
                      <label htmlFor="register-introduction" className={styles.nativeLabel}>
                        한줄 소개
                      </label>
                      <span className={styles.counter}>
                        {formValues.introduction.length}/{signupFormConfig.introductionMaxLength}
                      </span>
                    </div>
                    <textarea
                      id="register-introduction"
                      name="introduction"
                      value={formValues.introduction}
                      onChange={handleTextAreaChange}
                      placeholder="한 줄 소개를 입력해주세요."
                      maxLength={signupFormConfig.introductionMaxLength}
                      className={styles.introInput}
                      rows={2}
                    />
                    <p className={styles.inlineError}>{formErrors.introduction ?? ''}</p>
                  </div>

                  <div className={styles.bottomRow}>
                    <div className={styles.selectBlock}>
                      <label htmlFor="register-region" className={styles.nativeLabel}>
                        활동 지역
                      </label>
                      <select
                        id="register-region"
                        name="region"
                        value={formValues.region}
                        onChange={handleSelectChange}
                        className={styles.selectInput}
                      >
                        {signupFormConfig.regions.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.emailBlock}>
                      <span className={styles.fieldLabel}>이메일</span>
                      <InputField
                        id="register-email"
                        name="email"
                        type="email"
                        label="이메일"
                        placeholder="example@bangchelin.com"
                        variant={formErrors.email ? 'error' : 'default'}
                        value={formValues.email}
                        onChange={handleInputChange('email')}
                        onBlur={handleEmailBlur}
                        showClearButton
                        onClear={handleFieldClear('email')}
                        hideLabel
                        className={styles.emailField}
                        rootStyle={inputRootStyle}
                        autoComplete="email"
                        inputMode="email"
                        pattern={emailPattern.source}
                      />
                      <p className={styles.inlineError}>{formErrors.email ?? ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.footerRow}>
                <div>
                  <Link to={ROUTES.login} className={styles.backLink}>
                    로그인으로 돌아가기
                  </Link>
                </div>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Sign Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
    <Popup
      open={submitStatus.kind === 'error'}
      onClose={() => setSubmitStatus({ kind: 'idle', message: '' })}
      title="회원가입 실패"
      description={submitStatus.message}
      actions={submitErrorActions}
      role="alertdialog"
      maxWidth={366}
    />
    </>
  );
}
