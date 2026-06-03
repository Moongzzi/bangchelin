export type CalendarEventStatus = 'recruiting' | 'closed' | 'done';

export type CalendarEventCategory = 'escape' | 'theater' | 'boardgame' | 'etc';

export type CalendarLocationRegion = 'seoul' | 'gyeonggi' | 'incheon';

export type CalendarParticipantStatus = 'confirmed' | 'waitlisted';

export type CalendarEventParticipant = {
  id: string;
  profileId?: string | null;
  displayName: string;
  status: CalendarParticipantStatus;
};

export type CalendarEventComment = {
  id: string;
  eventId?: string;
  parentId?: string | null;
  userId?: string;
  author: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  replies?: CalendarEventComment[];
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
  locationRegion?: CalendarLocationRegion | '';
  location: string;
  capacity: number;
  currentParticipants: number;
  participantsDetail?: CalendarEventParticipant[];
  description?: string;
  organizer?: string;
  participants?: string[];
  waitlistedParticipants?: string[];
  isCurrentUserParticipant?: boolean;
  isCurrentUserWaitlisted?: boolean;
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
