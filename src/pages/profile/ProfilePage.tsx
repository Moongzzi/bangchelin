import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getMyProfile,
  updateMyProfile,
  type ActivityRegion,
  type Profile,
} from '../../features/auth/auth.api';
import { PageShell } from '../../shared/components/layout/PageShell';
import { ROUTES } from '../../shared/constants/routes';
import { signupFormConfig } from '../register/registerConfig';

type ProfileFormValues = {
  nickname: string;
  birthDate: string;
  introduction: string;
  activityRegion: ActivityRegion | '';
  email: string;
};

type PageStatus = 'loading' | 'editing' | 'saving' | 'error' | 'success' | 'empty';

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

function createInitialValues(profile?: Profile | null): ProfileFormValues {
  return {
    nickname: profile?.nickname ?? '',
    birthDate: profile?.birth_date ?? '',
    introduction: profile?.introduction ?? '',
    activityRegion: profile?.activity_region ?? '',
    email: profile?.email ?? '',
  };
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formValues, setFormValues] = useState<ProfileFormValues>(() => createInitialValues());
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

  const avatarSrc = useMemo(
    () => avatarPreviewUrl ?? profile?.avatar_url ?? '',
    [avatarPreviewUrl, profile?.avatar_url],
  );

  function updateField<K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    if (status === 'success' || status === 'error') {
      setStatus('editing');
      setMessage('');
    }
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formValues.nickname.trim()) {
      setStatus('error');
      setMessage('닉네임은 1자 이상이어야 합니다.');
      return;
    }

    if (formValues.nickname.length > signupFormConfig.nicknameMaxLength) {
      setStatus('error');
      setMessage(`닉네임은 ${signupFormConfig.nicknameMaxLength}자 이내여야 합니다.`);
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

      setProfile(nextProfile);
      setAvatarFile(null);
      setStatus('success');
      setMessage('프로필이 저장되었습니다.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '프로필 저장에 실패했습니다.');
    }
  }

  return (
    <PageShell>
      <section className="mx-auto w-[var(--space-content)] py-16">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-soft)]">
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
            <form className="mt-8 grid max-w-3xl gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-semibold">
                프로필 이미지
                <div className="flex items-center gap-4">
                  <div className="grid size-24 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-white">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="프로필 이미지" className="size-full object-cover" />
                    ) : (
                      <span className="text-2xl text-[var(--color-text-muted)]">
                        {formValues.nickname.slice(0, 1) || 'B'}
                      </span>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} />
                </div>
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                닉네임
                <input
                  className="h-11 rounded border border-[var(--color-border)] bg-white px-3"
                  value={formValues.nickname}
                  maxLength={signupFormConfig.nicknameMaxLength}
                  onChange={(event) => updateField('nickname', event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                생일
                <input
                  className="h-11 rounded border border-[var(--color-border)] bg-white px-3"
                  type="date"
                  value={formValues.birthDate}
                  onChange={(event) => updateField('birthDate', event.target.value)}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                한줄 소개
                <input
                  className="h-11 rounded border border-[var(--color-border)] bg-white px-3"
                  value={formValues.introduction}
                  maxLength={signupFormConfig.introductionMaxLength}
                  onChange={(event) => updateField('introduction', event.target.value)}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                활동지역
                <select
                  className="h-11 rounded border border-[var(--color-border)] bg-white px-3"
                  value={formValues.activityRegion}
                  onChange={(event) => updateField('activityRegion', event.target.value as ActivityRegion | '')}
                >
                  <option value="">선택 안 함</option>
                  {signupFormConfig.regions.map((label, index) => (
                    <option key={regionValues[index]} value={regionValues[index]}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                이메일
                <input
                  className="h-11 rounded border border-[var(--color-border)] bg-white px-3"
                  type="email"
                  value={formValues.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </label>

              {message ? (
                <p
                  className={status === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-700'}
                  role={status === 'error' ? 'alert' : 'status'}
                >
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                className="h-11 w-36 rounded-full bg-[var(--color-brand)] text-white disabled:opacity-60"
                disabled={status === 'saving'}
              >
                {status === 'saving' ? '저장 중...' : '저장'}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
