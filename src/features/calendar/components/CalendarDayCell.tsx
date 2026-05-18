import type { CalendarEvent, CalendarMonthCell } from '../types/calendar.types';
import styles from './CalendarShared.module.css';

type CalendarDayCellProps = {
  cell: CalendarMonthCell;
  events: CalendarEvent[];
  selected: boolean;
  visibleEventCount: number;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
};

export function CalendarDayCell({
  cell,
  events,
  selected,
  visibleEventCount,
  onSelectDate,
  onSelectEvent,
}: CalendarDayCellProps) {
  const visibleEvents = events.slice(0, visibleEventCount);
  const hiddenEventCount = Math.max(events.length - visibleEventCount, 0);

  return (
    <button
      type="button"
      className={[
        styles.dayCell,
        !cell.inCurrentMonth ? styles.dayCellOutside : '',
        cell.isToday ? styles.dayCellToday : '',
        selected ? styles.dayCellSelected : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onSelectDate(cell.date)}
      aria-pressed={selected}
    >
      <span
        className={[
          styles.dayNumberButton,
          cell.isSunday ? styles.dayNumberSunday : '',
          cell.isSaturday ? styles.dayNumberSaturday : '',
        ].filter(Boolean).join(' ')}
      >
        {cell.dayNumber}
      </span>

      <div className={styles.dayEventList}>
        {visibleEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            className={styles.dayEventButton}
            onClick={(eventClick) => {
              eventClick.stopPropagation();
              onSelectEvent(event.id);
            }}
          >
            <span className={styles.dayEventDot} aria-hidden="true" />
            <span className={styles.dayEventTitle}>{event.title}</span>
          </button>
        ))}

        {hiddenEventCount > 0 ? <p className={styles.moreEventsLabel}>+{hiddenEventCount}개 일정</p> : null}
      </div>
    </button>
  );
}
