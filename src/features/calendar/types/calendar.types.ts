export type CalendarEventStatus = 'recruiting' | 'closed' | 'done';

export type CalendarEventCategory = 'escape' | 'theater' | 'boardgame' | 'etc';

export type CalendarLocationRegion = 'seoul' | 'gyeonggi' | 'incheon';

export type CalendarEventComment = {
  id: string;
  author: string;
  content: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  status: CalendarEventStatus;
  category: CalendarEventCategory;
  location: string;
  capacity: number;
  currentParticipants: number;
  description?: string;
  organizer?: string;
  participants?: string[];
  comments?: CalendarEventComment[];
  isAllDay?: boolean;
};

export type CalendarEventFormValues = {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: CalendarEventStatus;
  category: CalendarEventCategory;
  locationRegion: CalendarLocationRegion | '';
  locationDetail: string;
  participantLimit: string;
  externalGuestCount: string;
  participantNames: string[];
  description: string;
  isAllDay: boolean;
};

export type CalendarMonthCell = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSunday: boolean;
  isSaturday: boolean;
};

export type CalendarEventSpanPosition = 'single' | 'start' | 'middle' | 'end';

export type CalendarEventInCell = {
  event: CalendarEvent;
  spanPosition: CalendarEventSpanPosition;
};

export type ConfirmDialogTone = 'default' | 'danger' | 'brand';
