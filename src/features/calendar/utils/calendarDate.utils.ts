import { calendarConfig } from '../constants/calendar.constants';
import type { CalendarEvent, CalendarEventInCell, CalendarMonthCell } from '../types/calendar.types';

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

export function buildMonthGrid(currentMonth: Date, todayDateKey: string = calendarConfig.mockToday): CalendarMonthCell[] {
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

function getEventEndDateKey(event: CalendarEvent) {
  return event.endDate ?? event.date;
}

function enumerateDateKeys(startDateKey: string, endDateKey: string) {
  const startDate = parseDateKey(startDateKey);
  const endDate = parseDateKey(endDateKey);
  const dateKeys: string[] = [];

  for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    dateKeys.push(formatDateKey(currentDate));
  }

  return dateKeys;
}

function resolveSpanPosition(currentDateKey: string, startDateKey: string, endDateKey: string) {
  if (startDateKey === endDateKey) {
    return 'single' as const;
  }

  if (currentDateKey === startDateKey) {
    return 'start' as const;
  }

  if (currentDateKey === endDateKey) {
    return 'end' as const;
  }

  return 'middle' as const;
}

export function groupEventsByDate(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEventInCell[]>>((grouped, event) => {
    const startDateKey = event.date;
    const endDateKey = getEventEndDateKey(event);

    enumerateDateKeys(startDateKey, endDateKey).forEach((dateKey) => {
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey]?.push({
        event,
        spanPosition: resolveSpanPosition(dateKey, startDateKey, endDateKey),
      });
    });

    Object.values(grouped).forEach((group) => {
      group.sort((left, right) => `${left.event.startTime}${left.event.endTime}`.localeCompare(`${right.event.startTime}${right.event.endTime}`));
    });

    return grouped;
  }, {});
}

export function getEventsForDate(events: CalendarEvent[], dateKey: string) {
  return events
    .filter((event) => event.date <= dateKey && getEventEndDateKey(event) >= dateKey)
    .sort((left, right) => `${left.startTime}${left.endTime}`.localeCompare(`${right.startTime}${right.endTime}`));
}

export function formatMonthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

export function formatEnglishMonthLabel(date: Date) {
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

export function formatDateTimeRange(startDateKey: string, endDateKey: string, startTime: string, endTime: string) {
  const startDate = parseDateKey(startDateKey);
  const endDate = parseDateKey(endDateKey);
  const startDateLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(startDate);

  const endDateLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(endDate);

  return `${startDateLabel} ${startTime} - ${endDateLabel} ${endTime}`;
}
