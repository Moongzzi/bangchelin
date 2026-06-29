import { useEffect, useState, type ChangeEvent, type CSSProperties } from 'react';

import {
  createAdminKakaoShareMessage,
  getAdminKakaoShareMessages,
  uploadAdminKakaoShareImage,
  type AdminKakaoShareCategory,
  type AdminKakaoShareMessage,
} from '../../features/admin/adminKakaoShare.api';
import { getKakaoJavaScriptKey, prepareKakaoShare } from '../../shared/lib/kakaoShare';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import { colors } from '../../shared/styles/tokens/colors';
import styles from './AdminKakaoSharePage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';
type SubmitMode = 'save' | 'share';

type ShareDraft = {
  category: AdminKakaoShareCategory;
  title: string;
  content: string;
  imageUrls: string[];
  targetUrl: string;
  buttonUrl1: string;
  buttonUrl2: string;
  buttonText1: string;
  buttonText2: string;
};

const displayCategoryLabels: Record<AdminKakaoShareCategory, string> = {
  notice: '공지',
  update: '업데이트',
};

const noticeTemplateIdsByImageCount: Record<number, number> = {
  0: 134410,
  1: 134409,
  2: 134408,
  3: 134407,
};

const noticeDefaultTemplateId = 134410;

const kakaoTemplateIds = {
  updateWithoutButton: 134406,
  updateWithOneButton: 134411,
  updateWithTwoButtons: 134412,
};

const defaultDraft: ShareDraft = {
  category: 'notice',
  title: '',
  content: '',
  imageUrls: ['', '', ''],
  targetUrl: '',
  buttonUrl1: '',
  buttonUrl2: '',
  buttonText1: '',
  buttonText2: '',
};

function normalizeImageUrls(imageUrls: string[]) {
  return imageUrls.map((imageUrl) => imageUrl.trim()).filter(Boolean).slice(0, 3);
}

function getUpdateButtonCount(draft: ShareDraft) {
  return [draft.buttonUrl1, draft.buttonUrl2].filter((buttonUrl) => buttonUrl.trim()).length;
}

function getTemplateId(draft: ShareDraft) {
  if (draft.category === 'notice') {
    return noticeTemplateIdsByImageCount[normalizeImageUrls(draft.imageUrls).length] ?? noticeDefaultTemplateId;
  }

  const buttonCount = getUpdateButtonCount(draft);

  if (buttonCount >= 2) {
    return kakaoTemplateIds.updateWithTwoButtons;
  }

  if (buttonCount === 1) {
    return kakaoTemplateIds.updateWithOneButton;
  }

  return kakaoTemplateIds.updateWithoutButton;
}

function getDefaultTargetUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return new URL(basePath || '/', window.location.origin).toString();
}

function isValidUrl(value: string) {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getKakaoLinkParts(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      domain: '',
      path: '',
      url: '',
    };
  }

  try {
    const url = new URL(trimmedValue);
    return {
      domain: url.origin,
      path: `${url.pathname}${url.search}${url.hash}`,
      url: url.toString(),
    };
  } catch {
    return {
      domain: '',
      path: trimmedValue,
      url: trimmedValue,
    };
  }
}

function formatDateTime(value: string) {
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

function getShareTitle(draft: ShareDraft) {
  return draft.title.trim();
}

function buildTemplateArgs(draft: ShareDraft): Record<string, string> {
  const profileName = displayCategoryLabels[draft.category];
  const imageUrls = normalizeImageUrls(draft.imageUrls);
  const buttonUrl1 = draft.buttonUrl1.trim();
  const buttonUrl2 = draft.buttonUrl2.trim();
  const buttonText1 = draft.buttonText1.trim();
  const buttonText2 = draft.buttonText2.trim();
  const buttonLink1 = getKakaoLinkParts(buttonUrl1);
  const buttonLink2 = getKakaoLinkParts(buttonUrl2);
  const targetUrl = draft.targetUrl.trim() || getDefaultTargetUrl();
  const title = getShareTitle(draft);
  const content = draft.content.trim();
  const image1 = imageUrls[0] ?? '';
  const image2 = imageUrls[1] ?? '';
  const image3 = imageUrls[2] ?? '';

  if (draft.category === 'update') {
    return {
      profileName,
      profile_name: profileName,
      PROFILE_NAME: profileName,
      category: profileName,
      CATEGORY: profileName,
      title,
      TITLE: title,
      content,
      CONTENT: content,
      button1: buttonUrl1,
      button2: buttonUrl2,
      buttonDomain1: buttonLink1.domain,
      buttonDomain2: buttonLink2.domain,
      buttonPath1: buttonLink1.path,
      buttonPath2: buttonLink2.path,
      buttonUrl1,
      buttonUrl2,
      buttonText1,
      buttonText2,
    };
  }

  return {
    profileName,
    profile_name: profileName,
    PROFILE_NAME: profileName,
    category: profileName,
    CATEGORY: profileName,
    title,
    TITLE: title,
    messageTitle: title,
    message_title: title,
    noticeTitle: title,
    notice_title: title,
    NOTICE_TITLE: title,
    content,
    CONTENT: content,
    desc: content,
    DESC: content,
    description: content,
    DESCRIPTION: content,
    messageContent: content,
    message_content: content,
    noticeContent: content,
    notice_content: content,
    NOTICE_CONTENT: content,
    image1,
    image2,
    image3,
    imageUrl: image1,
    image_url: image1,
    IMAGE_URL: image1,
    image: image1,
    IMAGE: image1,
    thumbnailUrl: image1,
    thumbnail_url: image1,
    THUMBNAIL_URL: image1,
    THU: image1,
    targetUrl,
    target_url: targetUrl,
    TARGET_URL: targetUrl,
    buttonUrl1,
    buttonText1,
    button_url_1: buttonUrl1,
    BUTTON_URL_1: buttonUrl1,
    button_text_1: buttonText1,
    BUTTON_TEXT_1: buttonText1,
    button1: buttonUrl1,
    button1Url: buttonUrl1,
    button1Text: buttonText1,
    button1_url: buttonUrl1,
    button1_text: buttonText1,
    BUTTON1_URL: buttonUrl1,
    BUTTON1_TEXT: buttonText1,
    buttonLink1: buttonUrl1,
    button_link_1: buttonUrl1,
    BUTTON_LINK_1: buttonUrl1,
    button1Link: buttonUrl1,
    button1_link: buttonUrl1,
    BUTTON1_LINK: buttonUrl1,
    buttonWebUrl1: buttonUrl1,
    button_web_url_1: buttonUrl1,
    BUTTON_WEB_URL_1: buttonUrl1,
    buttonMobileWebUrl1: buttonUrl1,
    button_mobile_web_url_1: buttonUrl1,
    BUTTON_MOBILE_WEB_URL_1: buttonUrl1,
    webUrl1: buttonUrl1,
    web_url_1: buttonUrl1,
    WEB_URL_1: buttonUrl1,
    mobileWebUrl1: buttonUrl1,
    mobile_web_url_1: buttonUrl1,
    MOBILE_WEB_URL_1: buttonUrl1,
    url1: buttonUrl1,
    URL1: buttonUrl1,
    link1: buttonUrl1,
    LINK1: buttonUrl1,
    buttonUrl2,
    buttonText2,
    button_url_2: buttonUrl2,
    BUTTON_URL_2: buttonUrl2,
    button_text_2: buttonText2,
    BUTTON_TEXT_2: buttonText2,
    button2: buttonUrl2,
    button2Url: buttonUrl2,
    button2Text: buttonText2,
    button2_url: buttonUrl2,
    button2_text: buttonText2,
    BUTTON2_URL: buttonUrl2,
    BUTTON2_TEXT: buttonText2,
    buttonLink2: buttonUrl2,
    button_link_2: buttonUrl2,
    BUTTON_LINK_2: buttonUrl2,
    button2Link: buttonUrl2,
    button2_link: buttonUrl2,
    BUTTON2_LINK: buttonUrl2,
    buttonWebUrl2: buttonUrl2,
    button_web_url_2: buttonUrl2,
    BUTTON_WEB_URL_2: buttonUrl2,
    buttonMobileWebUrl2: buttonUrl2,
    button_mobile_web_url_2: buttonUrl2,
    BUTTON_MOBILE_WEB_URL_2: buttonUrl2,
    webUrl2: buttonUrl2,
    web_url_2: buttonUrl2,
    WEB_URL_2: buttonUrl2,
    mobileWebUrl2: buttonUrl2,
    mobile_web_url_2: buttonUrl2,
    MOBILE_WEB_URL_2: buttonUrl2,
    url2: buttonUrl2,
    URL2: buttonUrl2,
    link2: buttonUrl2,
    LINK2: buttonUrl2,
    url: targetUrl,
    URL: targetUrl,
    link: targetUrl,
    LINK: targetUrl,
    webUrl: targetUrl,
    web_url: targetUrl,
    WEB_URL: targetUrl,
    mobileWebUrl: targetUrl,
    mobile_web_url: targetUrl,
    MOBILE_WEB_URL: targetUrl,
  };
}

function getDraftError(draft: ShareDraft, templateId: number | null) {
  if (!templateId) {
    return `${displayCategoryLabels[draft.category]} 템플릿 ID를 확인해 주세요.`;
  }

  if (draft.category === 'notice') {
    if (!draft.title.trim()) {
      return '공지 제목을 입력해 주세요.';
    }

    if (!draft.content.trim()) {
      return '공지 내용을 입력해 주세요.';
    }
  }

  if (draft.category === 'update') {
    if (!draft.title.trim()) {
      return '업데이트 제목을 입력해 주세요.';
    }

    if (!draft.content.trim()) {
      return '업데이트 내용을 입력해 주세요.';
    }

    if (draft.buttonUrl2.trim() && !draft.buttonUrl1.trim()) {
      return '버튼 URL 2를 사용하려면 버튼 URL 1을 먼저 입력해 주세요.';
    }

    if ((draft.buttonUrl1.trim() && !isValidUrl(draft.buttonUrl1)) || (draft.buttonUrl2.trim() && !isValidUrl(draft.buttonUrl2))) {
      return '업데이트 버튼 URL은 http 또는 https 주소로 입력해 주세요.';
    }

    if (draft.buttonUrl1.trim() && !draft.buttonText1.trim()) {
      return '버튼 1 텍스트를 입력해 주세요.';
    }

    if (draft.buttonUrl2.trim() && !draft.buttonText2.trim()) {
      return '버튼 2 텍스트를 입력해 주세요.';
    }
  }

  return '';
}

export function AdminKakaoSharePage() {
  const [messages, setMessages] = useState<AdminKakaoShareMessage[]>([]);
  const [draft, setDraft] = useState<ShareDraft>(defaultDraft);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [uploading, setUploading] = useState(false);

  const templateId = getTemplateId(draft);
  const draftError = getDraftError(draft, templateId);
  const canSubmit = !draftError && !submitMode && !uploading;

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      try {
        setStatus('loading');
        const nextMessages = await getAdminKakaoShareMessages();

        if (isMounted) {
          setMessages(nextMessages);
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '카카오 공유 메시지 목록을 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const kakaoKey = getKakaoJavaScriptKey();

    if (!kakaoKey) {
      return;
    }

    void prepareKakaoShare(kakaoKey).catch(() => {
      // The share button owns the visible fallback message.
    });
  }, []);

  const pageStyle = {
    '--admin-kakao-background': colors.background.default,
    '--admin-kakao-text': colors.text.primary,
    '--admin-kakao-muted': colors.text.tertiary,
    '--admin-kakao-panel': colors.background.elevated,
    '--admin-kakao-border': colors.border.subtle,
    '--admin-kakao-brand': colors.brand.primary,
    '--admin-kakao-brand-hover': colors.brand.primaryHover,
    '--admin-kakao-error': colors.semantic.error,
  } as CSSProperties;

  function updateDraft(nextDraft: Partial<ShareDraft>) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...nextDraft,
    }));
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleImageUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const imageUrl = await uploadAdminKakaoShareImage(file);
      setDraft((currentDraft) => {
        const nextImageUrls = [...currentDraft.imageUrls];
        nextImageUrls[index] = imageUrl;

        return {
          ...currentDraft,
          imageUrls: nextImageUrls.slice(0, 3),
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '공유 이미지를 업로드하지 못했습니다.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    const nextImageUrls = [...draft.imageUrls];
    nextImageUrls[index] = '';

    updateDraft({
      imageUrls: nextImageUrls.slice(0, 3),
    });
  }

  async function saveDraft() {
    if (!templateId) {
      throw new Error('템플릿 ID를 확인하지 못했습니다.');
    }

    const savedMessage = await createAdminKakaoShareMessage({
      category: draft.category,
      templateId,
      profileName: displayCategoryLabels[draft.category],
      title: draft.title,
      content: draft.content,
      items: [],
      imageUrls: draft.category === 'notice' ? normalizeImageUrls(draft.imageUrls) : [],
      targetUrl: draft.category === 'notice' ? getDefaultTargetUrl() : undefined,
      buttonUrl1: draft.category === 'update' ? draft.buttonUrl1 : undefined,
      buttonUrl2: draft.category === 'update' ? draft.buttonUrl2 : undefined,
      buttonText1: draft.category === 'update' ? draft.buttonText1 : undefined,
      buttonText2: draft.category === 'update' ? draft.buttonText2 : undefined,
    });

    setMessages((currentMessages) => [savedMessage, ...currentMessages].slice(0, 20));
    return savedMessage;
  }

  async function handleSave() {
    if (draftError) {
      setErrorMessage(draftError);
      return;
    }

    try {
      setSubmitMode('save');
      setErrorMessage('');
      setSuccessMessage('');
      await saveDraft();
      setSuccessMessage('카카오 공유 메시지를 저장했습니다.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '카카오 공유 메시지를 저장하지 못했습니다.');
    } finally {
      setSubmitMode(null);
    }
  }

  async function handleShare() {
    if (draftError) {
      setErrorMessage(draftError);
      return;
    }

    const kakaoKey = getKakaoJavaScriptKey();
    if (!kakaoKey) {
      setErrorMessage('VITE_KAKAO_JAVASCRIPT_KEY 환경 변수를 설정해 주세요.');
      return;
    }

    try {
      setSubmitMode('share');
      setErrorMessage('');
      setSuccessMessage('');
      await saveDraft();
      const kakaoShare = await prepareKakaoShare(kakaoKey);
      const latestTemplateArgs = buildTemplateArgs(draft);

      kakaoShare.sendCustom({
        templateId: templateId as number,
        templateArgs: latestTemplateArgs,
      });
      setSuccessMessage('카카오톡 공유 창을 열었습니다.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '카카오톡 공유에 실패했습니다.');
    } finally {
      setSubmitMode(null);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle} aria-label="카카오 공유 관리">
          <div className={styles.inner}>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>카카오 공유</h1>
                <p className={styles.description}>
                  공지와 업데이트 카테고리에 맞는 카카오 커스텀 메시지 템플릿을 선택해 공유합니다.
                </p>
              </div>
              <span className={styles.countBadge}>최근 {messages.length}건</span>
            </div>

            <div className={styles.layout}>
              <section className={styles.panel} aria-labelledby="kakao-share-form-title">
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 id="kakao-share-form-title" className={styles.sectionTitle}>메시지 작성</h2>
                  </div>
                  <span className={styles.countBadge}>
                    템플릿 {templateId ?? '미설정'}
                  </span>
                </div>

                <div className={styles.categoryGroup} aria-label="카카오 공유 카테고리">
                  {(['notice', 'update'] as AdminKakaoShareCategory[]).map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`${styles.categoryButton} ${draft.category === category ? styles.categoryButtonActive : ''}`}
                      aria-pressed={draft.category === category}
                      onClick={() => updateDraft({ category })}
                    >
                      {displayCategoryLabels[category]}
                    </button>
                  ))}
                </div>

                <div className={styles.formGrid}>
                  {draft.category === 'notice' ? (
                    <>
                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>이미지 업로드</span>
                        <span className={styles.uploadRow}>
                          <input type="file" accept="image/*" onChange={(event) => void handleImageUpload(0, event)} />
                          <span className={styles.statusText}>{uploading ? '업로드 중' : '선택 사항'}</span>
                        </span>
                      </label>

                      {draft.imageUrls[0] ? (
                        <div className={`${styles.imagePreviewBlock} ${styles.fullWidthField}`}>
                          <img src={draft.imageUrls[0]} alt="" className={styles.previewImage} />
                          <button type="button" className={styles.secondaryButton} onClick={() => removeImage(0)}>
                            이미지 제거
                          </button>
                        </div>
                      ) : null}

                      {[1, 2].map((imageIndex) => (
                        <div key={`share-image-${imageIndex}`} className={`${styles.field} ${styles.fullWidthField}`}>
                          <span>{`이미지 ${imageIndex + 1}`}</span>
                          {draft.imageUrls[imageIndex] ? (
                            <div className={styles.imagePreviewBlock}>
                              <img src={draft.imageUrls[imageIndex]} alt="" className={styles.previewImage} />
                              <button type="button" className={styles.secondaryButton} onClick={() => removeImage(imageIndex)}>
                                이미지 제거
                              </button>
                            </div>
                          ) : (
                            <span className={styles.uploadRow}>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                onChange={(event) => void handleImageUpload(imageIndex, event)}
                              />
                              <span className={styles.statusText}>{uploading ? '업로드 중' : '선택 사항'}</span>
                            </span>
                          )}
                        </div>
                      ))}

                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>메시지 제목</span>
                        <input
                          value={draft.title}
                          onChange={(event) => updateDraft({ title: event.target.value })}
                          placeholder="공지 제목"
                        />
                      </label>
                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>메시지 내용</span>
                        <textarea
                          value={draft.content}
                          onChange={(event) => updateDraft({ content: event.target.value })}
                          placeholder="공지 내용을 입력해 주세요."
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>메시지 제목</span>
                        <input
                          value={draft.title}
                          onChange={(event) => updateDraft({ title: event.target.value })}
                          placeholder="업데이트 제목"
                        />
                      </label>

                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>메시지 내용</span>
                        <textarea
                          value={draft.content}
                          onChange={(event) => updateDraft({ content: event.target.value })}
                          placeholder="업데이트 내용을 입력해 주세요."
                        />
                      </label>

                      <label className={styles.field}>
                        <span>버튼 URL 1</span>
                        <input
                          value={draft.buttonUrl1}
                          onChange={(event) => updateDraft({ buttonUrl1: event.target.value })}
                          placeholder="https://example.com"
                        />
                      </label>

                      <label className={styles.field}>
                        <span>버튼 텍스트 1</span>
                        <input
                          value={draft.buttonText1}
                          onChange={(event) => updateDraft({ buttonText1: event.target.value })}
                          placeholder="자세히 보기"
                        />
                      </label>

                      <label className={styles.field}>
                        <span>버튼 URL 2</span>
                        <input
                          value={draft.buttonUrl2}
                          onChange={(event) => updateDraft({ buttonUrl2: event.target.value })}
                          placeholder="https://example.com"
                        />
                      </label>

                      <label className={styles.field}>
                        <span>버튼 텍스트 2</span>
                        <input
                          value={draft.buttonText2}
                          onChange={(event) => updateDraft({ buttonText2: event.target.value })}
                          placeholder="확인하기"
                        />
                      </label>
                    </>
                  )}
                </div>

                <div className={styles.actionRow}>
                  <span className={styles.statusText}>{draftError || '공유 전에 메시지 기록이 자동 저장됩니다.'}</span>
                  <div className={styles.actionRow}>
                    <button type="button" className={styles.secondaryButton} disabled={!canSubmit} onClick={() => void handleSave()}>
                      {submitMode === 'save' ? '저장 중' : '저장'}
                    </button>
                    <button type="button" className={styles.saveButton} disabled={!canSubmit} onClick={() => void handleShare()}>
                      {submitMode === 'share' ? '공유 준비 중' : '카카오톡 공유'}
                    </button>
                  </div>
                </div>

                {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
                {successMessage ? <p className={styles.successMessage}>{successMessage}</p> : null}
              </section>

              <aside className={styles.panel} aria-labelledby="kakao-share-history-title">
                <div>
                  <h2 id="kakao-share-history-title" className={styles.sectionTitle}>최근 작성</h2>
                  <p className={styles.sectionDescription}>최근 저장한 공유 메시지 20건입니다.</p>
                </div>

                {status === 'loading' ? (
                  <p className={styles.message}>카카오 공유 메시지를 불러오는 중입니다.</p>
                ) : null}

                {status === 'error' ? (
                  <p className={styles.errorMessage} role="alert">{errorMessage}</p>
                ) : null}

                {status === 'ready' && messages.length === 0 ? (
                  <p className={styles.message}>아직 저장한 공유 메시지가 없습니다.</p>
                ) : null}

                {messages.length > 0 ? (
                  <div className={styles.historyList}>
                    {messages.map((message) => (
                      <article key={message.id} className={styles.historyItem}>
                        <strong>{message.title || message.content}</strong>
                        <p className={styles.historyMeta}>
                          {displayCategoryLabels[message.category]} · 템플릿 {message.templateId} · {formatDateTime(message.createdAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


