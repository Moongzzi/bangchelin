import { colors } from '../../../shared/styles/tokens/colors';
import type {
  CalendarEventCategory,
  CalendarEventStatus,
  ConfirmDialogTone,
} from '../types/calendar.types';

export const calendarLayoutTokens = {
  todaySidebarWidth: '350px',
  calendarMaxWidth: '920px',
  rightPanelWidth: '360px',
  pageMinHeight: 'calc(100vh - 160px)',
} as const;

export const calendarStyleTokens = {
  pageBackground: colors.background.default,
  panelBackground: colors.surface.default,
  selectedDayBackground: colors.background.secondary,
  selectedDayBorder: colors.border.strong,
  todayTextColor: colors.brand.primary,
  eventPillBackground: colors.accent.roseSoft,
  eventDotBackground: colors.brand.primarySoft,
  brandPrimary: colors.brand.primary,
  onPrimary: colors.text.onPrimary,
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  borderDefault: colors.border.default,
  borderStrong: colors.border.strong,
  borderSubtle: colors.border.subtle,
  surfaceElevated: colors.background.elevated,
  accentNavy: colors.accent.navy,
  focusRing: colors.accent.rose,
  dimBackground: 'rgba(32, 28, 25, 0.28)',
} as const;

export const calendarConfig = {
  weekDays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  visibleWeekCount: 6,
  defaultVisibleEventCount: 2,
  maxTodayEvents: 3,
  mockToday: '2026-04-10',
} as const;

export const calendarStatusLabels: Record<CalendarEventStatus, string> = {
  recruiting: '모집',
  closed: '마감',
  done: '종료',
};

export const calendarCategoryLabels: Record<CalendarEventCategory, string> = {
  escape: '방탈출',
  theater: '연극',
  boardgame: '보드게임',
  etc: '기타',
};

export const calendarStatusTone: Record<
  CalendarEventStatus,
  { background: string; text: string; border: string }
> = {
  recruiting: {
    background: colors.semantic.infoSoft,
    text: colors.accent.navy,
    border: colors.accent.navy,
  },
  closed: {
    background: colors.semantic.warningSoft,
    text: colors.semantic.warning,
    border: colors.semantic.warning,
  },
  done: {
    background: colors.semantic.successSoft,
    text: colors.semantic.success,
    border: colors.semantic.success,
  },
};

export const calendarCategoryTone: Record<
  CalendarEventCategory,
  { background: string; text: string; border: string }
> = {
  escape: {
    background: colors.accent.roseSoft,
    text: colors.brand.primary,
    border: colors.accent.rose,
  },
  theater: {
    background: colors.accent.goldSoft,
    text: colors.accent.gold,
    border: colors.accent.gold,
  },
  boardgame: {
    background: colors.semantic.successSoft,
    text: colors.semantic.success,
    border: colors.semantic.success,
  },
  etc: {
    background: colors.background.secondary,
    text: colors.text.secondary,
    border: colors.border.strong,
  },
};

export const confirmToneStyles: Record<ConfirmDialogTone, { background: string; text: string }> = {
  default: {
    background: colors.background.default,
    text: colors.text.primary,
  },
  danger: {
    background: colors.brand.primary,
    text: colors.text.onPrimary,
  },
  brand: {
    background: colors.brand.primary,
    text: colors.text.onPrimary,
  },
};

export const calendarStatusOptions = Object.entries(calendarStatusLabels).map(([value, label]) => ({
  value: value as CalendarEventStatus,
  label,
}));

export const calendarCategoryOptions = Object.entries(calendarCategoryLabels).map(([value, label]) => ({
  value: value as CalendarEventCategory,
  label,
}));
