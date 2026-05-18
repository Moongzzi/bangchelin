import { calendarConfig } from '../constants/calendar.constants';
import type { CalendarEvent, CalendarMonthCell } from '../types/calendar.types';
import { formatMonthLabel, formatYearLabel } from '../utils/calendarDate.utils';
import { CalendarDayCell } from './CalendarDayCell';
import styles from './CalendarShared.module.css';

type MonthCalendarProps = {
  currentMonth: Date;
  monthCells: CalendarMonthCell[];
  eventsByDate: Record<string, CalendarEvent[]>;
  selectedDateKey: string | null;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MonthCalendar({
  currentMonth,
  monthCells,
  eventsByDate,
  selectedDateKey,
  onSelectDate,
  onSelectEvent,
  onPreviousMonth,
  onNextMonth,
}: MonthCalendarProps) {
  return (
    <section className={styles.calendarShell} aria-label="월간 달력">
      <div className={styles.monthHeader}>
        <div className={styles.monthLabelWrap}>
          <p className={styles.monthYearLabel}>{formatYearLabel(currentMonth)}</p>
          <h1 className={styles.monthTitle}>{formatMonthLabel(currentMonth)}</h1>
        </div>

        <div className={styles.monthNav}>
          <button type="button" className={styles.monthNavButton} onClick={onPreviousMonth} aria-label="이전 달 보기">
            <ChevronLeftIcon />
          </button>
          <button type="button" className={styles.monthNavButton} onClick={onNextMonth} aria-label="다음 달 보기">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className={styles.weekdayRow} role="row">
        {calendarConfig.weekDays.map((weekDay) => (
          <div key={weekDay} className={styles.weekdayLabel} role="columnheader">
            {weekDay}
          </div>
        ))}
      </div>

      <div className={styles.monthGrid} role="grid">
        {monthCells.map((cell) => (
          <CalendarDayCell
            key={cell.dateKey}
            cell={cell}
            events={eventsByDate[cell.dateKey] ?? []}
            selected={selectedDateKey === cell.dateKey}
            visibleEventCount={calendarConfig.defaultVisibleEventCount}
            onSelectDate={onSelectDate}
            onSelectEvent={onSelectEvent}
          />
        ))}
      </div>
    </section>
  );
}
