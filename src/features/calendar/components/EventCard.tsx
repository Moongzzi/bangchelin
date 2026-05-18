import type { CSSProperties } from 'react';

import {
  calendarCategoryLabels,
  calendarCategoryTone,
  calendarStatusLabels,
  calendarStatusTone,
} from '../constants/calendar.constants';
import type { CalendarEvent } from '../types/calendar.types';
import styles from './CalendarShared.module.css';

type EventCardProps = {
  event: CalendarEvent;
  isActive?: boolean;
  onClick: (eventId: string) => void;
};

function getBadgeStyle(background: string, text: string, border: string) {
  return {
    backgroundColor: background,
    color: text,
    borderColor: border,
  } as CSSProperties;
}

export function EventCard({ event, isActive = false, onClick }: EventCardProps) {
  const statusTone = calendarStatusTone[event.status];
  const categoryTone = calendarCategoryTone[event.category];

  return (
    <button
      type="button"
      className={`${styles.eventCardButton} ${isActive ? styles.eventCardButtonActive : ''}`.trim()}
      onClick={() => onClick(event.id)}
    >
      <div className={styles.eventCardMetaRow}>
        <span className={styles.eventBadge} style={getBadgeStyle(statusTone.background, statusTone.text, statusTone.border)}>
          {calendarStatusLabels[event.status]}
        </span>
        <span className={styles.eventBadge} style={getBadgeStyle(categoryTone.background, categoryTone.text, categoryTone.border)}>
          {calendarCategoryLabels[event.category]}
        </span>
        <span className={styles.eventCardMeta}>{event.currentParticipants}/{event.capacity}</span>
      </div>

      <p className={styles.eventCardTitle}>{event.title}</p>
      <p className={styles.eventCardDescription}>{event.description ?? '모집 일정 제목이 입력되는 공간입니다.'}</p>

      <div className={styles.eventCardFooter}>
        <span className={styles.eventCardMeta}>{event.startTime} - {event.endTime}</span>
        <span className={styles.eventCardMeta}>{event.location}</span>
      </div>
    </button>
  );
}
