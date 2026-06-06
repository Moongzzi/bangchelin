export type CalendarEventStatus = 'recruiting' | 'closed' | 'done';

export type CalendarEventCategory = 'escape' | 'boardgame' | 'theater' | 'murder_mystery' | 'game' | 'etc';

export type CalendarLocationRegion =
  | 'seoul'
  | 'gyeonggi_incheon'
  | 'gyeonggi'
  | 'incheon'
  | 'chungcheong'
  | 'gyeongsang'
  | 'jeolla'
  | 'gangwon'
  | 'jeju';

export type CalendarParticipantStatus = 'confirmed' | 'waitlisted';

export type CalendarEventParticipant = {
  id: string;
  profileId?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  status: CalendarParticipantStatus;
};

export type CalendarEventAuthor = {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
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
  author?: CalendarEventAuthor | null;
  participantsDetail?: CalendarEventParticipant[];
  description?: string;
  organizer?: string;
  participants?: string[];
  waitlistedParticipants?: string[];
  isCurrentUserAuthor?: boolean;
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
