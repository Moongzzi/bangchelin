import type { CalendarMonthCell } from '../types/calendar.types';
import styles from './CalendarShared.module.css';

type CalendarDayCellProps = {
  cell: CalendarMonthCell;
  selected: boolean;
  hiddenEventCount: number;
  onSelectDate: (date: Date) => void;
};

export function CalendarDayCell({
  cell,
  selected,
  hiddenEventCount,
  onSelectDate,
}: CalendarDayCellProps) {
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

      <div className={styles.dayEventMeta}>
        {hiddenEventCount > 0 ? <p className={styles.moreEventsLabel}>+{hiddenEventCount}개 일정</p> : null}
      </div>
    </button>
  );
}
