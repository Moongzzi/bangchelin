import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getMyProfile,
  updateMyProfile,
  type ActivityRegion,
  type Profile,
} from '../../features/auth/auth.api';
import { InputField } from '../../shared/components/input-field';
import { PageShell } from '../../shared/components/layout/PageShell';
import { ROUTES } from '../../shared/constants/routes';
import { colors } from '../../shared/styles/tokens/colors';
import { emailPattern, signupFormConfig } from '../register/registerConfig';

type ProfileFormValues = {
  nickname: string;
  birthDate: string;
  introduction: string;
  activityRegion: ActivityRegion | '';
  email: string;
};

type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

type PageStatus = 'loading' | 'editing' | 'saving' | 'error' | 'success' | 'empty';

const regionValues: ActivityRegion[] = [
  'seoul',
  'gyeonggi_incheon',
  'chungcheong',
  'gyeongsang',
  'jeolla',
  'gangwon',
  'jeju',
];

function createInitialValues(profile?: Profile | null): ProfileFormValues {
  const activityRegion = profile?.activity_region === 'incheon' || profile?.activity_region === 'gyeonggi'
    ? 'gyeonggi_incheon'
    : profile?.activity_region ?? '';

  return {
    nickname: profile?.nickname ?? '',
    birthDate: profile?.birth_date ?? '',
    introduction: profile?.introduction ?? '',
    activityRegion,
    email: profile?.email ?? '',
  };
}

function isSameProfileFormValues(left: ProfileFormValues, right: ProfileFormValues) {
  return (
    left.nickname === right.nickname &&
    left.birthDate === right.birthDate &&
    left.introduction === right.introduction &&
    left.activityRegion === right.activityRegion &&
    left.email === right.email
  );
}

function validateProfileForm(values: ProfileFormValues) {
  const errors: ProfileFormErrors = {};

  if (!values.nickname.trim()) {
    errors.nickname = '닉네임을 입력해주세요.';
  } else if (values.nickname.length > signupFormConfig.nicknameMaxLength) {
    errors.nickname = `닉네임은 ${signupFormConfig.nicknameMaxLength}자 이내여야 합니다.`;
  }

  if (values.introduction.length > signupFormConfig.introductionMaxLength) {
    errors.introduction = `자기 소개는 ${signupFormConfig.introductionMaxLength}자 이내여야 합니다.`;
  }

  if (values.email.trim() && !emailPattern.test(values.email.trim())) {
    errors.email = '이메일 형식을 확인해주세요.';
  }

  return errors;
}

function hasFormErrors(errors: ProfileFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formValues, setFormValues] = useState<ProfileFormValues>(() => createInitialValues());
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const nextProfile = await getMyProfile();

        if (!isMounted) {
          return;
        }

        if (!nextProfile) {
          setStatus('empty');
          return;
        }

        setProfile(nextProfile);
        setFormValues(createInitialValues(nextProfile));
        setStatus('editing');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus('error');
        setMessage(error instanceof Error ? error.message : '프로필을 불러오지 못했습니다.');
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const savedValues = useMemo(() => createInitialValues(profile), [profile]);
  const avatarSrc = useMemo(
    () => avatarPreviewUrl ?? profile?.avatar_url ?? '',
    [avatarPreviewUrl, profile?.avatar_url],
  );
  const hasAvatarChange = avatarFile !== null;
  const hasProfileFieldChanges = !isSameProfileFormValues(formValues, savedValues);
  const hasUnsavedChanges = hasAvatarChange || hasProfileFieldChanges;
  const isSaving = status === 'saving';
  const canSave = hasUnsavedChanges && !isSaving;

  const inputRootStyle = {
    '--input-border': colors.border.default,
    '--input-border-active': colors.accent.navyHover,
    '--input-control-background': colors.surface.elevated,
    '--input-element-background': colors.surface.elevated,
    '--input-control-min-height-outlined': '44px',
    '--input-padding-outlined': '10px 0',
    '--input-outlined-padding-x': '12px',
    '--input-font-size': '0.875rem',
    '--input-line-height': '1.25',
    '--input-message-error': colors.semantic.error,
    '--input-message-success': colors.semantic.success,
  } as CSSProperties;

  const introductionInputRootStyle = {
    ...inputRootStyle,
    '--input-textarea-min-height': '44px',
    '--input-textarea-resize': 'vertical',
  } as CSSProperties;

  function updateField<K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) {
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

    if (status === 'success' || status === 'error') {
      setStatus('editing');
      setMessage('');
    }
  }

  function handleInputChange(field: keyof ProfileFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateField(field, event.target.value as ProfileFormValues[typeof field]);
    };
  }

  function handleFieldClear(field: keyof ProfileFormValues) {
    return () => updateField(field, '' as ProfileFormValues[typeof field]);
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    setAvatarFile(nextFile);
    setAvatarPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return URL.createObjectURL(nextFile);
    });

    if (status === 'success' || status === 'error') {
      setStatus('editing');
      setMessage('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasUnsavedChanges || isSaving) {
      return;
    }

    const nextErrors = validateProfileForm(formValues);
    setFormErrors(nextErrors);

    if (hasFormErrors(nextErrors)) {
      setStatus('error');
      setMessage('입력값을 다시 확인해주세요.');
      return;
    }

    setStatus('saving');

    try {
      const nextProfile = await updateMyProfile({
        nickname: formValues.nickname,
        avatarFile,
        birthDate: formValues.birthDate,
        introduction: formValues.introduction,
        activityRegion: formValues.activityRegion || null,
        email: formValues.email,
      });

      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }

      setProfile(nextProfile);
      setFormValues(createInitialValues(nextProfile));
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setStatus('success');
      setMessage('프로필이 저장되었습니다.');
      window.dispatchEvent(new Event('bangchelin:profile-updated'));
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '프로필 저장에 실패했습니다.');
    }
  }

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-[1120px] min-w-0 px-4 py-16">
        <div className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-accent)]">Profile</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl">프로필</h1>

          {status === 'loading' ? (
            <p className="mt-6 leading-8 text-[var(--color-text-muted)]">프로필을 불러오는 중입니다.</p>
          ) : null}

          {status === 'empty' ? (
            <div className="mt-6">
              <p className="leading-8 text-[var(--color-text-muted)]">로그인이 필요합니다.</p>
              <Link to={ROUTES.login} className="mt-4 inline-block text-[var(--color-accent)]">
                로그인으로 이동
              </Link>
            </div>
          ) : null}

          {status !== 'loading' && status !== 'empty' ? (
            <form id="profile-form" className="mt-8 grid w-full max-w-3xl min-w-0 gap-5" onSubmit={handleSubmit} noValidate>
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                프로필 이미지
                <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-white">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="프로필 이미지" className="size-full object-cover" />
                    ) : (
                      <span className="text-2xl text-[var(--color-text-muted)]">
                        {formValues.nickname.slice(0, 1) || 'B'}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full min-w-0 max-w-full text-sm"
                    onChange={handleAvatarChange}
                    disabled={isSaving}
                  />
                </div>
              </label>

              <InputField
                id="profile-nickname"
                name="nickname"
                label="닉네임"
                placeholder="닉네임을 입력해주세요."
                variant={formErrors.nickname ? 'error' : 'outlined'}
                value={formValues.nickname}
                maxLength={signupFormConfig.nicknameMaxLength}
                onChange={handleInputChange('nickname')}
                showClearButton
                onClear={handleFieldClear('nickname')}
                rootStyle={inputRootStyle}
                className="min-w-0"
                message={formErrors.nickname}
                required
                disabled={isSaving}
              />

              <InputField
                id="profile-birth-date"
                name="birthDate"
                type="date"
                label="생일"
                placeholder="생일을 선택해주세요."
                variant="outlined"
                value={formValues.birthDate}
                onChange={handleInputChange('birthDate')}
                rootStyle={inputRootStyle}
                className="min-w-0"
                disabled={isSaving}
              />

              <InputField
                id="profile-introduction"
                name="introduction"
                label="자기 소개"
                placeholder="자기 소개를 입력해주세요."
                variant={formErrors.introduction ? 'error' : 'outlined'}
                value={formValues.introduction}
                maxLength={signupFormConfig.introductionMaxLength}
                onChange={handleInputChange('introduction')}
                showClearButton
                onClear={handleFieldClear('introduction')}
                rootStyle={introductionInputRootStyle}
                className="min-w-0"
                message={
                  formErrors.introduction ??
                  `${formValues.introduction.length}/${signupFormConfig.introductionMaxLength}`
                }
                messageType={formErrors.introduction ? 'error' : 'helper'}
                multiline
                rows={2}
                disabled={isSaving}
              />

              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                활동지역
                <select
                  className="h-11 w-full min-w-0 rounded border border-[var(--color-border)] bg-white px-3"
                  value={formValues.activityRegion}
                  onChange={(event) => updateField('activityRegion', event.target.value as ActivityRegion | '')}
                  disabled={isSaving}
                >
                  <option value="">선택 없음</option>
                  {signupFormConfig.regions.map((label, index) => (
                    <option key={regionValues[index]} value={regionValues[index]}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <InputField
                id="profile-email"
                name="email"
                type="email"
                label="이메일"
                placeholder="example@bangchelin.com"
                variant={formErrors.email ? 'error' : 'outlined'}
                value={formValues.email}
                onChange={handleInputChange('email')}
                showClearButton
                onClear={handleFieldClear('email')}
                rootStyle={inputRootStyle}
                className="min-w-0"
                message={formErrors.email}
                autoComplete="email"
                inputMode="email"
                pattern={emailPattern.source}
                disabled={isSaving}
              />

              {message ? (
                <p
                  className={status === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-700'}
                  role={status === 'error' ? 'alert' : 'status'}
                >
                  {message}
                </p>
              ) : null}

              <div className="flex w-full min-w-0 justify-stretch pt-2 sm:justify-end">
                <button
                  type="submit"
                  className="h-11 w-full min-w-0 rounded-full bg-[var(--color-accent)] text-white transition-colors hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-36"
                  disabled={!canSave}
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
