import { calendarConfig } from '../constants/calendar.constants';
import type { CalendarEvent } from '../types/calendar.types';
import { formatWeekdayLabel } from '../utils/calendarDate.utils';
import { EventCard } from './EventCard';
import styles from './CalendarShared.module.css';

type TodaySidebarProps = {
  selectedDate: Date;
  selectedDateEvents: CalendarEvent[];
  onCreateClick: () => void;
  onSelectEvent: (eventId: string) => void;
  selectedEventId: string | null;
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TodaySidebar({
  selectedDate,
  selectedDateEvents,
  onCreateClick,
  onSelectEvent,
  selectedEventId,
}: TodaySidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="선택한 날짜 일정 요약">
      <div className={styles.todaySummary}>
        <div>
          <p className={styles.todayStatValue}>{selectedDate.getDate()}</p>
          <p className={styles.todayStatLabel}>{formatWeekdayLabel(selectedDate)}</p>
        </div>
        <div>
          <p className={styles.todayStatValue}>{selectedDateEvents.length}건</p>
          <p className={styles.todayMetaLabel}>선택 일정</p>
        </div>
      </div>

      <button type="button" className={styles.todayCreateButton} onClick={onCreateClick}>
        <PlusIcon />
        일정 생성
      </button>

      <div className={styles.todayCardList}>
        {selectedDateEvents.slice(0, calendarConfig.maxTodayEvents).map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isActive={event.id === selectedEventId}
            onClick={onSelectEvent}
          />
        ))}
      </div>
    </aside>
  );
}
