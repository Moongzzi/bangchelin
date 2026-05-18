import { calendarConfig } from '../constants/calendar.constants';
import type { CalendarEvent, CalendarMonthCell } from '../types/calendar.types';

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameDay(left: Date, right: Date) {
  return formatDateKey(left) === formatDateKey(right);
}

export function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function buildMonthGrid(currentMonth: Date, todayDateKey = calendarConfig.mockToday): CalendarMonthCell[] {
  const firstDay = startOfMonth(currentMonth);
  const firstDayIndex = firstDay.getDay();
  const visibleCellCount = calendarConfig.weekDays.length * calendarConfig.visibleWeekCount;
  const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1 - firstDayIndex);

  return Array.from({ length: visibleCellCount }, (_, index) => {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + index);
    const dateKey = formatDateKey(cellDate);
    const dayOfWeek = cellDate.getDay();

    return {
      date: cellDate,
      dateKey,
      dayNumber: cellDate.getDate(),
      inCurrentMonth: isSameMonth(cellDate, currentMonth),
      isToday: dateKey === todayDateKey,
      isWeekend: isWeekend(cellDate),
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6,
    };
  });
}

export function groupEventsByDate(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((grouped, event) => {
    if (!grouped[event.date]) {
      grouped[event.date] = [];
    }

    grouped[event.date]?.push(event);
    grouped[event.date]?.sort((left, right) => `${left.startTime}${left.endTime}`.localeCompare(`${right.startTime}${right.endTime}`));

    return grouped;
  }, {});
}

export function getEventsForDate(events: CalendarEvent[], dateKey: string) {
  return events
    .filter((event) => event.date === dateKey)
    .sort((left, right) => `${left.startTime}${left.endTime}`.localeCompare(`${right.startTime}${right.endTime}`));
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
}

export function formatYearLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(date);
}

export function formatWeekdayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
}

export function formatShortDateLabel(dateKey: string) {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

export function formatDateTimeRange(dateKey: string, startTime: string, endTime: string) {
  const date = parseDateKey(dateKey);
  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);

  return `${dateLabel} ${startTime} - ${dateLabel} ${endTime}`;
}
