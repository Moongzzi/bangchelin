import type { ReactNode } from 'react';

import { calendarConfig } from '../constants/calendar.constants';
import type { CalendarEvent, CalendarEventInCell, CalendarMonthCell } from '../types/calendar.types';
import { formatEnglishMonthLabel, formatMonthLabel, formatYearLabel } from '../utils/calendarDate.utils';
import { CalendarDayCell } from './CalendarDayCell';
import styles from './CalendarShared.module.css';

type MonthCalendarProps = {
  currentMonth: Date;
  monthCells: CalendarMonthCell[];
  eventsByDate: Record<string, CalendarEventInCell[]>;
  selectedDateKey: string | null;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (eventId: string) => void;
  onPreviousMonth: () => void;
  onTodayClick: () => void;
  onNextMonth: () => void;
  filterControls?: ReactNode;
};

type WeekEventSegment = {
  event: CalendarEvent;
  lane: number;
  startColumn: number;
  endColumn: number;
  spanClassName: string;
  showDot: boolean;
};

function chunkWeekCells(monthCells: CalendarMonthCell[]) {
  return Array.from({ length: Math.ceil(monthCells.length / 7) }, (_, index) => monthCells.slice(index * 7, index * 7 + 7));
}

function getEventEndDateKey(event: CalendarEvent) {
  return event.endDate ?? event.date;
}

function buildWeekEventSegments(
  weekCells: CalendarMonthCell[],
  eventsByDate: Record<string, CalendarEventInCell[]>,
  visibleLaneCount: number,
) {
  const uniqueEvents = new Map<string, CalendarEvent>();

  weekCells.forEach((cell) => {
    (eventsByDate[cell.dateKey] ?? []).forEach(({ event }) => {
      uniqueEvents.set(event.id, event);
    });
  });

  const segmentCandidates = Array.from(uniqueEvents.values())
    .map((event) => {
      const endDateKey = getEventEndDateKey(event);
      const startColumn = weekCells.findIndex((cell) => cell.dateKey >= event.date && cell.dateKey <= endDateKey);
      let endColumn = -1;

      for (let cellIndex = weekCells.length - 1; cellIndex >= 0; cellIndex -= 1) {
        const cell = weekCells[cellIndex];

        if (cell && cell.dateKey >= event.date && cell.dateKey <= endDateKey) {
          endColumn = cellIndex;
          break;
        }
      }

      if (startColumn < 0 || endColumn < 0) {
        return null;
      }

      const segmentStartDateKey = weekCells[startColumn]?.dateKey ?? event.date;
      const segmentEndDateKey = weekCells[endColumn]?.dateKey ?? endDateKey;
      const isStart = segmentStartDateKey === event.date;
      const isEnd = segmentEndDateKey === endDateKey;
      const spanClassName = isStart && isEnd
        ? styles.weekEventBarSingle
        : isStart
          ? styles.weekEventBarStart
          : isEnd
            ? styles.weekEventBarEnd
            : styles.weekEventBarMiddle;

      return {
        event,
        startColumn,
        endColumn,
        spanClassName,
        showDot: isStart,
      };
    })
    .filter((segment): segment is Omit<WeekEventSegment, 'lane'> => Boolean(segment))
    .sort((left, right) => {
      const startDiff = left.startColumn - right.startColumn;
      if (startDiff !== 0) {
        return startDiff;
      }

      const widthDiff = (right.endColumn - right.startColumn) - (left.endColumn - left.startColumn);
      if (widthDiff !== 0) {
        return widthDiff;
      }

      return `${left.event.startTime}${left.event.endTime}`.localeCompare(`${right.event.startTime}${right.event.endTime}`);
    });

  const laneEndColumns = Array.from({ length: visibleLaneCount }, () => -1);

  return segmentCandidates.reduce<WeekEventSegment[]>((segments, segment) => {
    const lane = laneEndColumns.findIndex((lastEndColumn) => segment.startColumn > lastEndColumn);

    if (lane < 0) {
      return segments;
    }

    laneEndColumns[lane] = segment.endColumn;
    segments.push({
      ...segment,
      lane,
    });
    return segments;
  }, []);
}

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
  onTodayClick,
  onNextMonth,
  filterControls,
}: MonthCalendarProps) {
  const monthWeeks = chunkWeekCells(monthCells);

  return (
    <section className={styles.calendarShell} aria-label="월간 달력">
      <div className={styles.monthHeader}>
        <div className={styles.monthLabelWrap}>
          <p className={styles.monthYearLabel}>{formatYearLabel(currentMonth)}</p>
          <h1 className={styles.monthTitle}>
            {formatMonthLabel(currentMonth)}
            <span className={styles.monthTitleEnglish}>({formatEnglishMonthLabel(currentMonth)})</span>
          </h1>
        </div>

        <div className={styles.monthNav}>
          <button type="button" className={styles.monthNavButton} onClick={onPreviousMonth} aria-label="이전 달 보기">
            <ChevronLeftIcon />
          </button>
          <button type="button" className={styles.monthTodayButton} onClick={onTodayClick} aria-label="오늘로 이동">
            Today
          </button>
          <button type="button" className={styles.monthNavButton} onClick={onNextMonth} aria-label="다음 달 보기">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {filterControls ? filterControls : null}

      <div className={styles.weekdayRow} role="row">
        {calendarConfig.weekDays.map((weekDay) => (
          <div key={weekDay} className={styles.weekdayLabel} role="columnheader">
            {weekDay}
          </div>
        ))}
      </div>

      <div className={styles.monthWeeks} role="grid">
        {monthWeeks.map((weekCells) => {
          const weekSegments = buildWeekEventSegments(weekCells, eventsByDate, calendarConfig.defaultVisibleEventCount);

          return (
            <div key={weekCells[0]?.dateKey} className={styles.monthWeekRow}>
              <div className={styles.weekEventLayer} aria-hidden="true">
                {weekSegments.map((segment) => (
                  <button
                    key={`${segment.event.id}-${weekCells[0]?.dateKey}`}
                    type="button"
                    className={[styles.weekEventBar, segment.spanClassName].join(' ')}
                    style={{
                      gridColumn: `${segment.startColumn + 1} / ${segment.endColumn + 2}`,
                      gridRow: `${segment.lane + 1}`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectEvent(segment.event.id);
                    }}
                    aria-label={`${segment.event.title} 일정 보기`}
                  >
                    {segment.showDot ? <span className={styles.weekEventBarDot} aria-hidden="true" /> : null}
                    <span className={styles.weekEventBarTitle}>{segment.event.title}</span>
                  </button>
                ))}
              </div>

              <div className={styles.monthGrid}>
                {weekCells.map((cell) => (
                  <CalendarDayCell
                    key={cell.dateKey}
                    cell={cell}
                    selected={selectedDateKey === cell.dateKey}
                    hiddenEventCount={Math.max((eventsByDate[cell.dateKey] ?? []).length - calendarConfig.defaultVisibleEventCount, 0)}
                    onSelectDate={onSelectDate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
