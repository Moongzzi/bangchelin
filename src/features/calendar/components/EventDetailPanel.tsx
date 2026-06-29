import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';

import {
  calendarCategoryLabels,
  calendarCategoryTone,
  calendarStatusLabels,
  calendarStatusTone,
} from '../constants/calendar.constants';
import type { CalendarEvent, CalendarEventComment, CalendarEventParticipant } from '../types/calendar.types';
import { formatDateTimeRange, formatShortDateLabel } from '../utils/calendarDate.utils';
import { ROUTES } from '../../../shared/constants/routes';
import styles from './CalendarShared.module.css';

type EventDetailPanelProps = {
  selectedDateKey: string | null;
  selectedEvent: CalendarEvent | null;
  selectedDateEvents: CalendarEvent[];
  onSelectEvent: (eventId: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onJoinEvent: (eventId: string) => Promise<void>;
  onLeaveEvent: (eventId: string) => Promise<void>;
  attendanceSubmitting?: boolean;
  attendanceError?: string;
  currentUserId?: string | null;
  onSubmitComment: (content: string, parentId?: string | null) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  commentSubmitting?: boolean;
  commentActionSubmittingId?: string | null;
  commentError?: string;
  onClose: () => void;
};

type KakaoShareApi = {
  sendDefault: (options: {
    objectType: 'feed';
    content: {
      title: string;
      description: string;
      imageUrl?: string;
      link: {
        mobileWebUrl: string;
        webUrl: string;
      };
    };
    buttons: Array<{
      title: string;
      link: {
        mobileWebUrl: string;
        webUrl: string;
      };
    }>;
  }) => void;
};

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: KakaoShareApi;
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

const kakaoSdkScriptId = 'kakao-javascript-sdk';
const kakaoSdkUrl = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js';

function toneStyle(background: string, text: string, border: string) {
  return {
    backgroundColor: background,
    color: text,
    borderColor: border,
  } as CSSProperties;
}

const commentUrlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const trailingUrlPunctuationPattern = /[.,!?;:)\]}]+$/;

function renderCommentContent(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(commentUrlPattern)) {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;
    const trailingPunctuation = rawUrl.match(trailingUrlPunctuationPattern)?.[0] ?? '';
    const linkText = trailingPunctuation ? rawUrl.slice(0, -trailingPunctuation.length) : rawUrl;

    if (!linkText) {
      continue;
    }

    if (matchIndex > lastIndex) {
      nodes.push(content.slice(lastIndex, matchIndex));
    }

    const href = /^https?:\/\//i.test(linkText) ? linkText : `https://${linkText}`;
    nodes.push(
      <a
        key={`${matchIndex}-${linkText}`}
        className={styles.commentLink}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {linkText}
      </a>,
    );

    if (trailingPunctuation) {
      nodes.push(trailingPunctuation);
    }

    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes.length ? nodes : [content];
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m12 6 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
      <path d="M5 7h14M9 7V5h6v2m-7 3v7m4-7v7m4-7v7M7 7l1 12h8l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
      <path d="M8 12h8M16 12l-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4M14 6h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function getEventShareUrl(eventId: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const sharePath = `${basePath}${ROUTES.calendar}` || ROUTES.calendar;
  const shareUrl = new URL(sharePath, window.location.origin);
  shareUrl.searchParams.set('event', eventId);
  return shareUrl.toString();
}

function getKakaoSdk() {
  return new Promise<KakaoSdk>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('브라우저에서만 공유할 수 있습니다.'));
      return;
    }

    if (window.Kakao) {
      resolve(window.Kakao);
      return;
    }

    const existingScript = document.getElementById(kakaoSdkScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.Kakao) {
          resolve(window.Kakao);
        } else {
          reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
        }
      }, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('카카오 SDK를 불러오지 못했습니다.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = kakaoSdkScriptId;
    script.src = kakaoSdkUrl;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.Kakao) {
        resolve(window.Kakao);
      } else {
        reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
      }
    };
    script.onerror = () => reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
}

function getKakaoKey() {
  return import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY as string | undefined;
}

async function prepareKakaoShare(kakaoKey: string) {
  const kakao = await getKakaoSdk();

  if (!kakao.isInitialized()) {
    kakao.init(kakaoKey);
  }

  if (!kakao.Share) {
    throw new Error('카카오 공유 기능을 사용할 수 없습니다.');
  }

  return kakao.Share;
}

async function copyShareUrl(shareUrl: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = shareUrl;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function getParticipantInitial(displayName: string) {
  return displayName.trim().slice(0, 1).toUpperCase() || 'B';
}

function renderParticipantChip(participant: CalendarEventParticipant, className?: string) {
  return (
    <span key={participant.id} className={`${styles.participantChip} ${className ?? ''}`.trim()}>
      <span className={styles.participantAvatar} aria-hidden="true">
        {participant.avatarUrl ? (
          <img src={participant.avatarUrl} alt="" className={styles.participantAvatarImage} />
        ) : (
          getParticipantInitial(participant.displayName)
        )}
      </span>
      <span>{participant.displayName}</span>
    </span>
  );
}

function toFallbackParticipant(displayName: string, status: CalendarEventParticipant['status']): CalendarEventParticipant {
  return {
    id: `${status}-${displayName}`,
    displayName,
    avatarUrl: null,
    status,
  };
}

function renderAuthorProfile(event: CalendarEvent) {
  const authorName = event.author?.nickname ?? event.organizer ?? '작성자 정보 없음';

  return (
    <div className={styles.detailAuthorProfile}>
      <span className={styles.detailAuthorAvatar} aria-hidden="true">
        {event.author?.avatarUrl ? (
          <img src={event.author.avatarUrl} alt="" className={styles.detailAuthorAvatarImage} />
        ) : (
          getParticipantInitial(authorName)
        )}
      </span>
      <div className={styles.detailAuthorTextGroup}>
        <p className={styles.detailAuthorLabel}>업로드한 유저</p>
        <p className={styles.detailAuthorName}>{authorName}</p>
      </div>
    </div>
  );
}

export function EventDetailPanel({
  selectedDateKey,
  selectedEvent,
  selectedDateEvents,
  onSelectEvent,
  onEditEvent,
  onDeleteEvent,
  onJoinEvent,
  onLeaveEvent,
  attendanceSubmitting = false,
  attendanceError,
  currentUserId,
  onSubmitComment,
  onUpdateComment,
  onDeleteComment,
  commentSubmitting = false,
  commentActionSubmittingId,
  commentError,
  onClose,
}: EventDetailPanelProps) {
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<CalendarEventComment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const commentComposerRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    const kakaoKey = getKakaoKey();
    if (!kakaoKey) {
      return;
    }

    void prepareKakaoShare(kakaoKey).catch(() => {
      // The visible fallback is handled when the user taps the Kakao share action.
    });
  }, [selectedEvent]);

  async function handleSubmitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContent = commentContent.trim();
    if (!trimmedContent || commentSubmitting) {
      return;
    }

    try {
      await onSubmitComment(trimmedContent, replyTarget?.id ?? null);
      setCommentContent('');
      setReplyTarget(null);
    } catch {
      // The parent panel owns the visible error message.
    }
  }

  function revealCommentComposer() {
    window.setTimeout(() => {
      commentComposerRef.current?.scrollIntoView({ block: 'end', inline: 'nearest' });
    }, 120);
  }

  function startEditComment(comment: CalendarEventComment) {
    setReplyTarget(null);
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentContent('');
  }

  async function submitEditComment(commentId: string) {
    const trimmedContent = editingCommentContent.trim();
    if (!trimmedContent || commentActionSubmittingId) {
      return;
    }

    try {
      await onUpdateComment(commentId, trimmedContent);
      cancelEditComment();
    } catch {
      // The parent panel owns the visible error message.
    }
  }

  function renderComment(comment: CalendarEventComment, depth = 0) {
    const isOwnComment = Boolean(currentUserId && comment.userId === currentUserId);
    const isEditing = editingCommentId === comment.id;
    const isActionSubmitting = commentActionSubmittingId === comment.id;
    const canSaveEdit = Boolean(editingCommentContent.trim()) && editingCommentContent.trim() !== comment.content.trim();

    return (
      <div key={comment.id} className={`${styles.commentItem} ${depth > 0 ? styles.commentReplyItem : ''}`.trim()}>
        <span className={styles.commentAvatar} aria-hidden="true">
          {comment.avatarUrl ? (
            <img src={comment.avatarUrl} alt="" className={styles.commentAvatarImage} />
          ) : (
            getParticipantInitial(comment.author)
          )}
        </span>
        <div className={styles.commentBody}>
          <div className={styles.commentHeader}>
            <p className={styles.detailMetaText}>{comment.author}</p>
            {depth === 0 && !isEditing ? (
              <button type="button" className={styles.commentReplyButton} onClick={() => setReplyTarget(comment)}>
                답글
              </button>
            ) : null}
            {isOwnComment && !isEditing ? (
              <div className={styles.commentActionGroup}>
                <button type="button" className={styles.commentReplyButton} onClick={() => startEditComment(comment)}>
                  수정
                </button>
                <button
                  type="button"
                  className={styles.commentReplyButton}
                  onClick={() => onDeleteComment(comment.id)}
                  disabled={isActionSubmitting}
                >
                  {isActionSubmitting ? '삭제 중' : '삭제'}
                </button>
              </div>
            ) : null}
          </div>
          {isEditing ? (
            <div className={styles.commentEditForm}>
              <textarea
                className={styles.commentInput}
                value={editingCommentContent}
                maxLength={500}
                rows={3}
                disabled={isActionSubmitting}
                onChange={(event) => setEditingCommentContent(event.target.value)}
              />
              <div className={styles.commentEditActions}>
                <button
                  type="button"
                  className={styles.commentEditCancelButton}
                  onClick={cancelEditComment}
                  disabled={isActionSubmitting}
                >
                  취소
                </button>
                <button
                  type="button"
                  className={styles.commentSubmitButton}
                  onClick={() => void submitEditComment(comment.id)}
                  disabled={isActionSubmitting || !canSaveEdit}
                >
                  {isActionSubmitting ? '저장 중' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.commentText}>{renderCommentContent(comment.content)}</p>
          )}
          {depth === 0 && comment.replies?.length ? (
            <div className={styles.commentReplyList}>
              {comment.replies.map((reply) => renderComment(reply, 1))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  async function handleCopyShareLink() {
    if (!selectedEvent) {
      return;
    }

    try {
      await copyShareUrl(getEventShareUrl(selectedEvent.id));
      setShareMessage('링크를 복사했습니다.');
    } catch {
      setShareMessage('링크 복사에 실패했습니다.');
    }
  }

  async function handleNativeShare() {
    if (!selectedEvent) {
      return;
    }

    const shareUrl = getEventShareUrl(selectedEvent.id);
    const shareText = `${formatDateTimeRange(selectedEvent.date, selectedEvent.endDate ?? selectedEvent.date, selectedEvent.startTime, selectedEvent.endTime)} · ${selectedEvent.location}`;

    if (!navigator.share) {
      await handleCopyShareLink();
      return;
    }

    try {
      await navigator.share({
        title: selectedEvent.title,
        text: shareText,
        url: shareUrl,
      });
      setShareMenuOpen(false);
      setShareMessage('');
    } catch {
      // Browser share sheets reject when the user cancels. Keep the menu open without surfacing an error.
    }
  }

  async function handleKakaoShare() {
    if (!selectedEvent) {
      return;
    }

    const kakaoKey = getKakaoKey();
    const shareUrl = getEventShareUrl(selectedEvent.id);
    const authorName = selectedEvent.author?.nickname ?? selectedEvent.organizer ?? '작성자 정보 없음';
    const dateTimeText = formatDateTimeRange(
      selectedEvent.date,
      selectedEvent.endDate ?? selectedEvent.date,
      selectedEvent.startTime,
      selectedEvent.endTime,
    );
    const participantSummary = `${selectedEvent.currentParticipants}/${selectedEvent.capacity}`;
    const title = `[${calendarStatusLabels[selectedEvent.status]}] ${participantSummary} • ${selectedEvent.title}`;
    const description = `작성자 : ${authorName} / ${dateTimeText} / ${selectedEvent.location}`;

    if (!kakaoKey) {
      await handleCopyShareLink();
      setShareMessage('카카오 키가 없어 링크를 복사했습니다.');
      return;
    }

    try {
      const kakaoShare = window.Kakao?.isInitialized() && window.Kakao.Share
        ? window.Kakao.Share
        : null;

      if (!kakaoShare) {
        setShareMessage('카카오 공유를 준비 중입니다. 잠시 후 다시 눌러주세요.');
        void prepareKakaoShare(kakaoKey)
          .then(() => setShareMessage('카카오 공유 준비가 완료되었습니다. 다시 눌러주세요.'))
          .catch(() => setShareMessage('카카오 SDK를 불러오지 못했습니다. 링크 복사를 이용해주세요.'));
        return;
      }

      kakaoShare.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '일정 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
      setShareMenuOpen(false);
      setShareMessage('');
    } catch {
      await handleCopyShareLink();
      setShareMessage('카카오 공유에 실패해 링크를 복사했습니다.');
    }
  }

  if (!selectedDateKey) {
    return null;
  }

  if (!selectedEvent) {
    return (
      <aside className={styles.detailPanel} aria-label="선택한 날짜 상세 정보">
        <div className={styles.detailHeader}>
          <div>
            <p className={styles.detailLabel}>선택 날짜</p>
            <h2 className={styles.detailTitle}>{formatShortDateLabel(selectedDateKey)}</h2>
          </div>
          <button type="button" className={styles.detailCloseButton} onClick={onClose} aria-label="상세 패널 닫기">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.detailEventList}>
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((event) => (
              <button key={event.id} type="button" className={styles.eventCardButton} onClick={() => onSelectEvent(event.id)}>
                <p className={styles.eventCardTitle}>{event.title}</p>
                <p className={styles.eventCardMeta}>{event.startTime} - {event.endTime}</p>
              </button>
            ))
          ) : (
            <div className={styles.emptyPanel}>
              <h3 className={styles.emptyPanelTitle}>등록된 일정이 없습니다.</h3>
              <p className={styles.emptyPanelText}>이 날짜에는 아직 일정이 등록되지 않았습니다.</p>
            </div>
          )}
        </div>
      </aside>
    );
  }

  const statusTone = calendarStatusTone[selectedEvent.status];
  const categoryTone = calendarCategoryTone[selectedEvent.category];
  const isRecruiting = selectedEvent.status === 'recruiting';
  const isAutoClosedWithWaitlist = selectedEvent.status === 'closed' && Boolean(selectedEvent.closedByCapacity);
  const canUseAttendance = isRecruiting || isAutoClosedWithWaitlist;
  const canManageEvent = Boolean(selectedEvent.isCurrentUserAuthor);
  const isAlreadyJoined = Boolean(selectedEvent.isCurrentUserParticipant || selectedEvent.isCurrentUserWaitlisted);
  const attendanceLabel = selectedEvent.currentParticipants >= selectedEvent.capacity || isAutoClosedWithWaitlist ? '대기 참석' : '참석';
  const participantDetails = selectedEvent.participantsDetail ?? [];
  const confirmedParticipants = participantDetails.length
    ? participantDetails.filter((participant) => participant.status === 'confirmed')
    : (selectedEvent.participants ?? []).map((displayName) => toFallbackParticipant(displayName, 'confirmed'));
  const waitlistedParticipants = participantDetails.length
    ? participantDetails.filter((participant) => participant.status === 'waitlisted')
    : (selectedEvent.waitlistedParticipants ?? []).map((displayName) => toFallbackParticipant(displayName, 'waitlisted'));

  return (
    <aside className={styles.detailPanel} aria-label="선택한 일정 상세 정보">
      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.detailTitle}>{selectedEvent.title}</h2>
        </div>
        <div className={styles.detailActionRow}>
          <div className={styles.detailShareWrap}>
            <button
              type="button"
              className={styles.detailCloseButton}
              onClick={() => {
                setShareMenuOpen((isOpen) => !isOpen);
                setShareMessage('');
              }}
              aria-label="일정 공유"
              aria-expanded={shareMenuOpen}
            >
              <ShareIcon />
            </button>
            {shareMenuOpen ? (
              <div className={styles.detailShareMenu} role="menu" aria-label="일정 공유 메뉴">
                <button type="button" className={styles.detailShareMenuButton} onClick={handleKakaoShare} role="menuitem">
                  카카오톡으로 공유
                </button>
                <button type="button" className={styles.detailShareMenuButton} onClick={handleCopyShareLink} role="menuitem">
                  링크 복사
                </button>
                <button type="button" className={styles.detailShareMenuButton} onClick={handleNativeShare} role="menuitem">
                  외부로 공유
                </button>
                {shareMessage ? <p className={styles.detailShareMessage}>{shareMessage}</p> : null}
              </div>
            ) : null}
          </div>
          {canManageEvent ? (
            <>
              <button type="button" className={styles.detailCloseButton} onClick={() => onEditEvent(selectedEvent)} aria-label="일정 수정">
                <PencilIcon />
              </button>
              <button type="button" className={styles.detailCloseButton} onClick={() => onDeleteEvent(selectedEvent.id)} aria-label="일정 삭제">
                <TrashIcon />
              </button>
            </>
          ) : null}
          <button type="button" className={styles.detailCloseButton} onClick={onClose} aria-label="상세 패널 닫기">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className={styles.detailPanelBody}>
        {renderAuthorProfile(selectedEvent)}

        <div className={styles.detailSection}>
          <div className={styles.detailMetaList}>
            <p className={styles.detailLabel}>제목</p>
            <p className={styles.detailMetaText}>{selectedEvent.title}</p>

            <p className={styles.detailLabel}>일시</p>
            <p className={styles.detailMetaText}>{formatDateTimeRange(selectedEvent.date, selectedEvent.endDate ?? selectedEvent.date, selectedEvent.startTime, selectedEvent.endTime)}</p>

            <p className={styles.detailLabel}>장소</p>
            <p className={styles.detailMetaText}>{selectedEvent.location}</p>

            <p className={styles.detailLabel}>모집 상태</p>
            <div className={styles.detailMetaRow}>
              <span className={styles.eventBadge} style={toneStyle(statusTone.background, statusTone.text, statusTone.border)}>
                {calendarStatusLabels[selectedEvent.status]}
              </span>
              {canUseAttendance ? (
                <div className={styles.attendanceActionGroup}>
                  <button
                    type="button"
                    className={styles.attendanceJoinButton}
                    disabled={attendanceSubmitting || isAlreadyJoined}
                    onClick={() => onJoinEvent(selectedEvent.id)}
                  >
                    {selectedEvent.isCurrentUserWaitlisted ? '대기 중' : attendanceLabel}
                  </button>
                  <button
                    type="button"
                    className={styles.attendanceLeaveButton}
                    disabled={attendanceSubmitting || !isAlreadyJoined}
                    onClick={() => onLeaveEvent(selectedEvent.id)}
                  >
                    불참
                  </button>
                </div>
              ) : null}
            </div>
            {attendanceError ? (
              <>
                <span aria-hidden="true" />
                <p className={styles.attendanceError} role="alert">{attendanceError}</p>
              </>
            ) : null}

            <p className={styles.detailLabel}>카테고리</p>
            <div className={styles.detailMetaRow}>
              <span className={styles.eventBadge} style={toneStyle(categoryTone.background, categoryTone.text, categoryTone.border)}>
                {calendarCategoryLabels[selectedEvent.category]}
              </span>
            </div>

            <p className={styles.detailLabel}>참석자</p>
            <p className={styles.detailMetaText}>{selectedEvent.currentParticipants}/{selectedEvent.capacity}</p>
          </div>
        </div>

        <div className={styles.detailSection}>
          <p className={styles.detailLabel}>참석자</p>
          <div className={styles.participantList}>
            {confirmedParticipants.map((participant) => renderParticipantChip(participant))}
          </div>
        </div>

        {canUseAttendance && (selectedEvent.currentParticipants >= selectedEvent.capacity || waitlistedParticipants.length > 0) ? (
          <div className={styles.detailSection}>
            <p className={styles.detailLabel}>대기 참석자</p>
            <div className={styles.participantList}>
              {waitlistedParticipants.length ? (
                waitlistedParticipants.map((participant) => renderParticipantChip(participant, styles.waitlistedParticipantChip))
              ) : (
                <p className={styles.emptyPanelText}>대기 참석자가 없습니다.</p>
              )}
            </div>
          </div>
        ) : null}

        <div className={styles.detailSection}>
          <p className={styles.detailLabel}>내용</p>
          <p className={styles.detailDescription}>{selectedEvent.description ?? '상세 일정 설명 내용 등을 작성하는 공간입니다.'}</p>
        </div>

        <div className={styles.detailSection}>
          <p className={styles.detailLabel}>댓글</p>
          <div className={styles.commentList}>
            {selectedEvent.comments?.length ? (
              selectedEvent.comments.map((comment) => renderComment(comment))
            ) : (
              <p className={styles.emptyPanelText}>아직 댓글이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      <form ref={commentComposerRef} className={styles.commentComposer} onSubmit={handleSubmitComment}>
        {replyTarget ? (
          <div className={styles.commentReplyTarget}>
            <span>{replyTarget.author}님에게 답글 작성 중</span>
            <button type="button" onClick={() => setReplyTarget(null)}>취소</button>
          </div>
        ) : null}
        <label className={styles.commentInputLabel} htmlFor="calendar-comment-input">댓글 작성</label>
        <div className={styles.commentInputRow}>
          <textarea
            id="calendar-comment-input"
            className={styles.commentInput}
            value={commentContent}
            maxLength={500}
            rows={2}
            placeholder={replyTarget ? '답글을 입력해주세요.' : '댓글을 입력해주세요.'}
            disabled={commentSubmitting}
            onFocus={revealCommentComposer}
            onChange={(event) => setCommentContent(event.target.value)}
          />
          <button type="submit" className={styles.commentSubmitButton} disabled={commentSubmitting || !commentContent.trim()}>
            {commentSubmitting ? '작성 중' : '등록'}
          </button>
        </div>
        {commentError ? <p className={styles.commentError} role="alert">{commentError}</p> : null}
      </form>
    </aside>
  );
}
