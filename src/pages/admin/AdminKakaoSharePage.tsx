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

const categoryLabels: Record<AdminKakaoShareCategory, string> = {
  notice: '怨듭?',
  update: '?낅뜲?댄듃',
};

const displayCategoryLabels: Record<AdminKakaoShareCategory, string> = {
  notice: '\uacf5\uc9c0',
  update: '\uc5c5\ub370\uc774\ud2b8',
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
    return `${displayCategoryLabels[draft.category]} \ud15c\ud50c\ub9bf ID\ub97c \ud655\uc778\ud574 \uc8fc\uc138\uc694.`;
  }

  if (draft.category === 'notice') {
    if (!draft.title.trim()) {
      return '\uacf5\uc9c0 \uc81c\ubaa9\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
    }

    if (!draft.content.trim()) {
      return '\uacf5\uc9c0 \ub0b4\uc6a9\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
    }
  }

  if (draft.category === 'update') {
    if (!draft.title.trim()) {
      return '\uc5c5\ub370\uc774\ud2b8 \uc81c\ubaa9\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
    }

    if (!draft.content.trim()) {
      return '\uc5c5\ub370\uc774\ud2b8 \ub0b4\uc6a9\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
    }

    if (draft.buttonUrl2.trim() && !draft.buttonUrl1.trim()) {
      return '\ubc84\ud2bc URL 2\ub97c \uc0ac\uc6a9\ud558\ub824\uba74 \ubc84\ud2bc URL 1\uc744 \uba3c\uc800 \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
    }

    if ((draft.buttonUrl1.trim() && !isValidUrl(draft.buttonUrl1)) || (draft.buttonUrl2.trim() && !isValidUrl(draft.buttonUrl2))) {
      return '\uc5c5\ub370\uc774\ud2b8 \ubc84\ud2bc URL\uc740 http \ub610\ub294 https \uc8fc\uc18c\ub85c \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
    }

    if (draft.buttonUrl1.trim() && !draft.buttonText1.trim()) {
      return '\ubc84\ud2bc 1 \ud14d\uc2a4\ud2b8\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
    }

    if (draft.buttonUrl2.trim() && !draft.buttonText2.trim()) {
      return '\ubc84\ud2bc 2 \ud14d\uc2a4\ud2b8\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694.';
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
          setErrorMessage(error instanceof Error ? error.message : '移댁뭅??怨듭쑀 硫붿떆吏 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??');
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
      setErrorMessage(error instanceof Error ? error.message : '怨듭쑀 ?대?吏瑜??낅줈?쒗븯吏 紐삵뻽?듬땲??');
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
      throw new Error('\ud15c\ud50c\ub9bf ID\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.');
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
      setSuccessMessage('移댁뭅??怨듭쑀 硫붿떆吏瑜???ν뻽?듬땲??');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '移댁뭅??怨듭쑀 硫붿떆吏瑜???ν븯吏 紐삵뻽?듬땲??');
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
      setErrorMessage('VITE_KAKAO_JAVASCRIPT_KEY ?섍꼍 蹂?섎? ?ㅼ젙?댁＜?몄슂.');
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
      setSuccessMessage('移댁뭅?ㅽ넚 怨듭쑀 李쎌쓣 ?댁뿀?듬땲??');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '移댁뭅?ㅽ넚 怨듭쑀???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setSubmitMode(null);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle} aria-label={'\uce74\uce74\uc624 \uacf5\uc720 \uad00\ub9ac'}>
          <div className={styles.inner}>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>{'\uce74\uce74\uc624 \uacf5\uc720'}</h1>
                <p className={styles.description}>
                  {'\uacf5\uc9c0\uc640 \uc5c5\ub370\uc774\ud2b8 \uce74\ud14c\uace0\ub9ac\uc5d0 \ub9de\ub294 \uce74\uce74\uc624 \ucee4\uc2a4\ud140 \uba54\uc2dc\uc9c0 \ud15c\ud50c\ub9bf\uc744 \uc120\ud0dd\ud574 \uacf5\uc720\ud569\ub2c8\ub2e4.'}
                </p>
              </div>
              <span className={styles.countBadge}>{'\ucd5c\uadfc'} {messages.length}{'\uac74'}</span>
            </div>

            <div className={styles.layout}>
              <section className={styles.panel} aria-labelledby="kakao-share-form-title">
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 id="kakao-share-form-title" className={styles.sectionTitle}>{'\uba54\uc2dc\uc9c0 \uc791\uc131'}</h2>
                  </div>
                  <span className={styles.countBadge}>
                    {'\ud15c\ud50c\ub9bf'} {templateId ?? '\ubbf8\uc124\uc815'}
                  </span>
                </div>

                <div className={styles.categoryGroup} aria-label={'\uce74\uce74\uc624 \uacf5\uc720 \uce74\ud14c\uace0\ub9ac'}>
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
                        <span>{'\uc774\ubbf8\uc9c0 \uc5c5\ub85c\ub4dc'}</span>
                        <span className={styles.uploadRow}>
                          <input type="file" accept="image/*" onChange={(event) => void handleImageUpload(0, event)} />
                          <span className={styles.statusText}>{uploading ? '\uc5c5\ub85c\ub4dc \uc911' : '\uc120\ud0dd \uc0ac\ud56d'}</span>
                        </span>
                      </label>

                      {draft.imageUrls[0] ? (
                        <div className={`${styles.imagePreviewBlock} ${styles.fullWidthField}`}>
                          <img src={draft.imageUrls[0]} alt="" className={styles.previewImage} />
                          <button type="button" className={styles.secondaryButton} onClick={() => removeImage(0)}>
                            {'\uc774\ubbf8\uc9c0 \uc81c\uac70'}
                          </button>
                        </div>
                      ) : null}

                      {[1, 2].map((imageIndex) => (
                        <div key={`share-image-${imageIndex}`} className={`${styles.field} ${styles.fullWidthField}`}>
                          <span>{`\uc774\ubbf8\uc9c0 ${imageIndex + 1}`}</span>
                          {draft.imageUrls[imageIndex] ? (
                            <div className={styles.imagePreviewBlock}>
                              <img src={draft.imageUrls[imageIndex]} alt="" className={styles.previewImage} />
                              <button type="button" className={styles.secondaryButton} onClick={() => removeImage(imageIndex)}>
                                {'\uc774\ubbf8\uc9c0 \uc81c\uac70'}
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
                              <span className={styles.statusText}>{uploading ? '\uc5c5\ub85c\ub4dc \uc911' : '\uc120\ud0dd \uc0ac\ud56d'}</span>
                            </span>
                          )}
                        </div>
                      ))}

                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>{'\uba54\uc2dc\uc9c0 \uc81c\ubaa9'}</span>
                        <input
                          value={draft.title}
                          onChange={(event) => updateDraft({ title: event.target.value })}
                          placeholder={'\uacf5\uc9c0 \uc81c\ubaa9'}
                        />
                      </label>
                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>{'\uba54\uc2dc\uc9c0 \ub0b4\uc6a9'}</span>
                        <textarea
                          value={draft.content}
                          onChange={(event) => updateDraft({ content: event.target.value })}
                          placeholder={'\uacf5\uc9c0 \ub0b4\uc6a9\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.'}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>{'\uba54\uc2dc\uc9c0 \uc81c\ubaa9'}</span>
                        <input
                          value={draft.title}
                          onChange={(event) => updateDraft({ title: event.target.value })}
                          placeholder={'\uc5c5\ub370\uc774\ud2b8 \uc81c\ubaa9'}
                        />
                      </label>

                      <label className={`${styles.field} ${styles.fullWidthField}`}>
                        <span>{'\uba54\uc2dc\uc9c0 \ub0b4\uc6a9'}</span>
                        <textarea
                          value={draft.content}
                          onChange={(event) => updateDraft({ content: event.target.value })}
                          placeholder={'\uc5c5\ub370\uc774\ud2b8 \ub0b4\uc6a9\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.'}
                        />
                      </label>

                      <label className={styles.field}>
                        <span>{'\ubc84\ud2bc URL 1'}</span>
                        <input
                          value={draft.buttonUrl1}
                          onChange={(event) => updateDraft({ buttonUrl1: event.target.value })}
                          placeholder="https://example.com"
                        />
                      </label>

                      <label className={styles.field}>
                        <span>{'\ubc84\ud2bc \ud14d\uc2a4\ud2b8 1'}</span>
                        <input
                          value={draft.buttonText1}
                          onChange={(event) => updateDraft({ buttonText1: event.target.value })}
                          placeholder={'\uc790\uc138\ud788 \ubcf4\uae30'}
                        />
                      </label>

                      <label className={styles.field}>
                        <span>{'\ubc84\ud2bc URL 2'}</span>
                        <input
                          value={draft.buttonUrl2}
                          onChange={(event) => updateDraft({ buttonUrl2: event.target.value })}
                          placeholder="https://example.com"
                        />
                      </label>

                      <label className={styles.field}>
                        <span>{'\ubc84\ud2bc \ud14d\uc2a4\ud2b8 2'}</span>
                        <input
                          value={draft.buttonText2}
                          onChange={(event) => updateDraft({ buttonText2: event.target.value })}
                          placeholder={'\ud655\uc778\ud558\uae30'}
                        />
                      </label>
                    </>
                  )}
                </div>

                <div className={styles.actionRow}>
                  <span className={styles.statusText}>{draftError || '\uacf5\uc720 \uc804\uc5d0 \uba54\uc2dc\uc9c0 \uae30\ub85d\uc774 \uc790\ub3d9 \uc800\uc7a5\ub429\ub2c8\ub2e4.'}</span>
                  <div className={styles.actionRow}>
                    <button type="button" className={styles.secondaryButton} disabled={!canSubmit} onClick={() => void handleSave()}>
                      {submitMode === 'save' ? '\uc800\uc7a5 \uc911' : '\uc800\uc7a5'}
                    </button>
                    <button type="button" className={styles.saveButton} disabled={!canSubmit} onClick={() => void handleShare()}>
                      {submitMode === 'share' ? '\uacf5\uc720 \uc900\ube44 \uc911' : '\uce74\uce74\uc624\ud1a1 \uacf5\uc720'}
                    </button>
                  </div>
                </div>

                {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
                {successMessage ? <p className={styles.successMessage}>{successMessage}</p> : null}
              </section>

              <aside className={styles.panel} aria-labelledby="kakao-share-history-title">
                <div>
                  <h2 id="kakao-share-history-title" className={styles.sectionTitle}>理쒓렐 ?묒꽦</h2>
                  <p className={styles.sectionDescription}>理쒓렐 ??ν븳 怨듭쑀 硫붿떆吏 20嫄댁엯?덈떎.</p>
                </div>

                {status === 'loading' ? (
                  <p className={styles.message}>移댁뭅??怨듭쑀 硫붿떆吏瑜?遺덈윭?ㅻ뒗 以묒엯?덈떎.</p>
                ) : null}

                {status === 'error' ? (
                  <p className={styles.errorMessage} role="alert">{errorMessage}</p>
                ) : null}

                {status === 'ready' && messages.length === 0 ? (
                  <p className={styles.message}>?꾩쭅 ??ν븳 怨듭쑀 硫붿떆吏媛 ?놁뒿?덈떎.</p>
                ) : null}

                {messages.length > 0 ? (
                  <div className={styles.historyList}>
                    {messages.map((message) => (
                      <article key={message.id} className={styles.historyItem}>
                        <strong>{message.title || message.content}</strong>
                        <p className={styles.historyMeta}>
                          {displayCategoryLabels[message.category]} 쨌 ?쒗뵆由?{message.templateId} 쨌 {formatDateTime(message.createdAt)}
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


