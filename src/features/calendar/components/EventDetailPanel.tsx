import { useState, type CSSProperties, type FormEvent } from 'react';

import {
  calendarCategoryLabels,
  calendarCategoryTone,
  calendarStatusLabels,
  calendarStatusTone,
} from '../constants/calendar.constants';
import type { CalendarEvent, CalendarEventComment } from '../types/calendar.types';
import { formatDateTimeRange, formatShortDateLabel } from '../utils/calendarDate.utils';
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
  onSubmitComment: (content: string, parentId?: string | null) => Promise<void>;
  commentSubmitting?: boolean;
  commentError?: string;
  onClose: () => void;
};

function toneStyle(background: string, text: string, border: string) {
  return {
    backgroundColor: background,
    color: text,
    borderColor: border,
  } as CSSProperties;
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
  onSubmitComment,
  commentSubmitting = false,
  commentError,
  onClose,
}: EventDetailPanelProps) {
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<CalendarEventComment | null>(null);

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

  function renderComment(comment: CalendarEventComment, depth = 0) {
    return (
      <div key={comment.id} className={`${styles.commentItem} ${depth > 0 ? styles.commentReplyItem : ''}`.trim()}>
        <span className={styles.commentDot} aria-hidden="true" />
        <div className={styles.commentBody}>
          <div className={styles.commentHeader}>
            <p className={styles.detailMetaText}>{comment.author}</p>
            {depth === 0 ? (
              <button type="button" className={styles.commentReplyButton} onClick={() => setReplyTarget(comment)}>
                답글
              </button>
            ) : null}
          </div>
          <p className={styles.commentText}>{comment.content}</p>
          {depth === 0 && comment.replies?.length ? (
            <div className={styles.commentReplyList}>
              {comment.replies.map((reply) => renderComment(reply, 1))}
            </div>
          ) : null}
        </div>
      </div>
    );
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
  const isAlreadyJoined = Boolean(selectedEvent.isCurrentUserParticipant || selectedEvent.isCurrentUserWaitlisted);
  const attendanceLabel = selectedEvent.currentParticipants >= selectedEvent.capacity ? '대기 참석' : '참석';

  return (
    <aside className={styles.detailPanel} aria-label="선택한 일정 상세 정보">
      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.detailTitle}>{selectedEvent.title}</h2>
        </div>
        <div className={styles.detailActionRow}>
          <button type="button" className={styles.detailCloseButton} onClick={() => onEditEvent(selectedEvent)} aria-label="일정 수정">
            <PencilIcon />
          </button>
          <button type="button" className={styles.detailCloseButton} onClick={() => onDeleteEvent(selectedEvent.id)} aria-label="일정 삭제">
            <TrashIcon />
          </button>
          <button type="button" className={styles.detailCloseButton} onClick={onClose} aria-label="상세 패널 닫기">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className={styles.detailPanelBody}>
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
              {isRecruiting ? (
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
            {(selectedEvent.participants ?? []).map((participant) => (
              <span key={participant} className={styles.participantChip}>{participant}</span>
            ))}
          </div>
        </div>

        {isRecruiting && selectedEvent.currentParticipants >= selectedEvent.capacity ? (
          <div className={styles.detailSection}>
            <p className={styles.detailLabel}>대기 참석자</p>
            <div className={styles.participantList}>
              {selectedEvent.waitlistedParticipants?.length ? (
                selectedEvent.waitlistedParticipants.map((participant) => (
                  <span key={participant} className={`${styles.participantChip} ${styles.waitlistedParticipantChip}`.trim()}>{participant}</span>
                ))
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

      <form className={styles.commentComposer} onSubmit={handleSubmitComment}>
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
