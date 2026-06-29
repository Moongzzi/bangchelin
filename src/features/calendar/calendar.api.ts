import { getSession, restRequest } from '../../shared/api/supabaseRest';
import { formatDateKey } from './utils/calendarDate.utils';
import type {
  CalendarEvent,
  CalendarEventCategory,
  CalendarEventComment,
  CalendarEventFormValues,
  CalendarLocationRegion,
  CalendarParticipantStatus,
  CalendarEventStatus,
} from './types/calendar.types';

type CalendarEventRow = {
  id: string;
  created_by: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: CalendarEventStatus;
  closed_by_capacity?: boolean;
  category: CalendarEventCategory;
  location_region: CalendarLocationRegion | null;
  location_detail: string;
  capacity: number;
  external_guest_count: number;
  description: string | null;
  is_all_day: boolean;
  comments: Array<{ id: string; author: string; content: string }>;
  profiles?: CalendarEventAuthorRow | null;
  calendar_event_participants?: CalendarEventParticipantRow[];
  calendar_event_comments?: CalendarEventCommentRow[];
};

type CalendarEventAuthorRow = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
};

type CalendarEventParticipantRow = {
  id: string;
  profile_id: string | null;
  display_name: string;
  status?: CalendarParticipantStatus;
  sort_order: number;
  created_at?: string;
  profiles?: {
    avatar_url: string | null;
  } | null;
};

type CalendarEventCommentRow = {
  id: string;
  event_id: string;
  parent_id: string | null;
  user_id: string;
  author_nickname?: string | null;
  author_avatar_url?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    nickname: string | null;
  } | null;
};

type CurrentUserProfileRow = {
  nickname: string | null;
};

export type CalendarParticipantSearchResult = {
  id: string;
  nickname: string;
  avatar_url: string | null;
};

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  return session;
}

function toParticipantNames(participants: CalendarEventParticipantRow[] = []) {
  return [...participants]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((participant) => participant.display_name);
}

function sortParticipants(participants: CalendarEventParticipantRow[] = []) {
  return [...participants].sort((left, right) => {
    const sortOrderDiff = left.sort_order - right.sort_order;

    if (sortOrderDiff !== 0) {
      return sortOrderDiff;
    }

    return (left.created_at ?? '').localeCompare(right.created_at ?? '');
  });
}

function toFlatComment(row: CalendarEventCommentRow): CalendarEventComment {
  return {
    id: row.id,
    eventId: row.event_id,
    parentId: row.parent_id,
    userId: row.user_id,
    author: row.author_nickname?.trim() || row.profiles?.nickname?.trim() || '알 수 없는 사용자',
    avatarUrl: row.author_avatar_url ?? null,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replies: [],
  };
}

function toCommentTree(commentRows: CalendarEventCommentRow[] = []) {
  const commentMap = new Map<string, CalendarEventComment>();
  const rootComments: CalendarEventComment[] = [];

  [...commentRows]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .forEach((row) => {
      commentMap.set(row.id, toFlatComment(row));
    });

  commentMap.forEach((comment) => {
    if (comment.parentId && commentMap.has(comment.parentId)) {
      commentMap.get(comment.parentId)?.replies?.push(comment);
      return;
    }

    rootComments.push(comment);
  });

  return rootComments;
}

function toCalendarEvent(row: CalendarEventRow): CalendarEvent {
  const session = getSession();
  const todayKey = formatDateKey(new Date());
  const effectiveStatus = row.end_date < todayKey ? 'done' : row.status;
  const participantRows = sortParticipants(row.calendar_event_participants);
  const confirmedParticipantRows = participantRows.filter((participant) => (participant.status ?? 'confirmed') === 'confirmed');
  const waitlistedParticipantRows = participantRows.filter((participant) => participant.status === 'waitlisted');
  const participants = toParticipantNames(confirmedParticipantRows);
  const waitlistedParticipants = toParticipantNames(waitlistedParticipantRows);
  const currentParticipants = participants.length + row.external_guest_count;
  const commentTree = toCommentTree(row.calendar_event_comments);
  const currentUserParticipant = participantRows.find((participant) => participant.profile_id === session?.user.id);

  return {
    id: row.id,
    title: row.title,
    date: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: effectiveStatus,
    closedByCapacity: effectiveStatus === 'closed' ? Boolean(row.closed_by_capacity) : false,
    category: row.category,
    locationRegion: row.location_region ?? '',
    location: row.location_detail,
    capacity: row.capacity,
    currentParticipants,
    author: row.profiles ? {
      id: row.profiles.id,
      nickname: row.profiles.nickname?.trim() || '탈퇴한 사용자',
      avatarUrl: row.profiles.avatar_url ?? null,
    } : null,
    participantsDetail: participantRows.map((participant) => ({
      id: participant.id,
      profileId: participant.profile_id,
      displayName: participant.display_name,
      avatarUrl: participant.profiles?.avatar_url ?? null,
      status: participant.status ?? 'confirmed',
    })),
    description: row.description ?? '',
    organizer: participants[0] ?? '',
    participants,
    waitlistedParticipants,
    isCurrentUserAuthor: row.created_by === session?.user.id,
    isCurrentUserParticipant: currentUserParticipant?.status === 'confirmed',
    isCurrentUserWaitlisted: currentUserParticipant?.status === 'waitlisted',
    comments: commentTree.length ? commentTree : row.comments ?? [],
    isAllDay: row.is_all_day,
  };
}

function toEventPayload(values: CalendarEventFormValues) {
  return {
    title: values.title.trim(),
    start_date: values.startDate,
    end_date: values.endDate,
    start_time: values.isAllDay ? '00:00' : values.startTime,
    end_time: values.isAllDay ? '23:59' : values.endTime,
    status: values.status,
    category: values.category,
    location_region: values.locationRegion || null,
    location_detail: values.locationDetail.trim(),
    capacity: Number(values.participantLimit || '0'),
    external_guest_count: Number(values.externalGuestCount || '0'),
    description: values.description.trim() || null,
    is_all_day: values.isAllDay,
  };
}

async function getCurrentUserParticipant(token: string, userId: string) {
  const [profile] = await restRequest<CurrentUserProfileRow[]>(`/profiles?id=eq.${userId}&select=nickname`, {
    token,
  });
  const nickname = profile?.nickname?.trim();

  if (!nickname) {
    throw new Error('Profile nickname is required.');
  }

  return {
    profileId: userId,
    displayName: nickname,
  };
}

function normalizeParticipantName(name: string) {
  return name.trim().toLowerCase();
}

async function replaceParticipants(
  eventId: string,
  participantNames: string[],
  token: string,
  ownerParticipant?: { profileId: string; displayName: string },
) {
  await restRequest(`/calendar_event_participants?event_id=eq.${eventId}`, {
    method: 'DELETE',
    token,
    headers: {
      Prefer: 'return=minimal',
    },
  });

  const ownerNameKey = ownerParticipant ? normalizeParticipantName(ownerParticipant.displayName) : null;
  const seenNames = new Set<string>(ownerNameKey ? [ownerNameKey] : []);
  const rows = [
    ...(ownerParticipant ? [{
      event_id: eventId,
      profile_id: ownerParticipant.profileId,
      display_name: ownerParticipant.displayName,
      status: 'confirmed',
      sort_order: 0,
    }] : []),
    ...participantNames.map((name) => name.trim()).filter(Boolean).flatMap((name) => {
      const nameKey = normalizeParticipantName(name);

      if (seenNames.has(nameKey)) {
        return [];
      }

      seenNames.add(nameKey);

      return [{
        event_id: eventId,
        display_name: name,
        status: 'confirmed',
        sort_order: seenNames.size - 1,
      }];
    }),
  ];

  if (!rows.length) {
    return;
  }

  try {
    await restRequest('/calendar_event_participants', {
      method: 'POST',
      token,
      body: rows,
    });
  } catch (error) {
    if (!isMissingParticipantStatusError(error)) {
      throw error;
    }

    await restRequest('/calendar_event_participants', {
      method: 'POST',
      token,
      body: rows.map(({ status: _status, ...row }) => row),
    });
  }
}

const eventSelect = [
  'id',
  'created_by',
  'title',
  'start_date',
  'end_date',
  'start_time',
  'end_time',
  'status',
  'closed_by_capacity',
  'category',
  'location_region',
  'location_detail',
  'capacity',
  'external_guest_count',
  'description',
  'is_all_day',
  'comments',
  'profiles!calendar_events_created_by_profiles_fkey(id,nickname,avatar_url)',
  'calendar_event_participants(id,profile_id,display_name,status,sort_order,created_at,profiles(avatar_url))',
  'calendar_event_comments(id,event_id,parent_id,user_id,author_nickname,author_avatar_url,content,created_at,updated_at)',
].join(',');

const legacyEventSelect = [
  'id',
  'created_by',
  'title',
  'start_date',
  'end_date',
  'start_time',
  'end_time',
  'status',
  'category',
  'location_region',
  'location_detail',
  'capacity',
  'external_guest_count',
  'description',
  'is_all_day',
  'comments',
  'calendar_event_participants(id,profile_id,display_name,sort_order,created_at,profiles(avatar_url))',
  'calendar_event_comments(id,event_id,parent_id,user_id,content,created_at,updated_at,profiles(nickname))',
].join(',');

function isMissingParticipantStatusError(error: unknown) {
  return error instanceof Error
    && error.message.includes('calendar_event_participants')
    && error.message.includes('status')
    && error.message.includes('does not exist');
}

function isMissingAuthorProfileRelationshipError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('calendar_events')
    && message.includes('profiles')
    && (
      message.includes('relationship')
      || message.includes('schema cache')
      || message.includes('calendar_events_created_by_profiles_fkey')
    );
}

function isMissingCommentAuthorSnapshotError(error: unknown) {
  return error instanceof Error
    && error.message.includes('calendar_event_comments')
    && (error.message.includes('author_nickname') || error.message.includes('author_avatar_url'))
    && error.message.includes('does not exist');
}

function isMissingClosedByCapacityError(error: unknown) {
  return error instanceof Error
    && error.message.includes('calendar_events')
    && error.message.includes('closed_by_capacity')
    && error.message.includes('does not exist');
}

export async function getCalendarEventsByRange(startDate: string, endDate: string) {
  const session = getRequiredSession();

  let rows: CalendarEventRow[];

  try {
    rows = await restRequest<CalendarEventRow[]>(
      `/calendar_events?start_date=lte.${endDate}&end_date=gte.${startDate}&select=${eventSelect}&order=start_date.asc,start_time.asc`,
      {
        token: session.access_token,
      },
    );
  } catch (error) {
    if (isMissingAuthorProfileRelationshipError(error)) {
      rows = await restRequest<CalendarEventRow[]>(
        `/calendar_events?start_date=lte.${endDate}&end_date=gte.${startDate}&select=${legacyEventSelect}&order=start_date.asc,start_time.asc`,
        {
          token: session.access_token,
        },
      );
      return rows.map(toCalendarEvent);
    }

    if (!isMissingParticipantStatusError(error) && !isMissingCommentAuthorSnapshotError(error) && !isMissingClosedByCapacityError(error)) {
      throw error;
    }

    rows = await restRequest<CalendarEventRow[]>(
      `/calendar_events?start_date=lte.${endDate}&end_date=gte.${startDate}&select=${legacyEventSelect}&order=start_date.asc,start_time.asc`,
      {
        token: session.access_token,
      },
    );
  }

  return rows.map(toCalendarEvent);
}

export async function getCalendarEvent(eventId: string) {
  const session = getRequiredSession();
  let rows: CalendarEventRow[];

  try {
    rows = await restRequest<CalendarEventRow[]>(
      `/calendar_events?id=eq.${eventId}&select=${eventSelect}`,
      {
        token: session.access_token,
      },
    );
  } catch (error) {
    if (isMissingAuthorProfileRelationshipError(error)) {
      rows = await restRequest<CalendarEventRow[]>(
        `/calendar_events?id=eq.${eventId}&select=${legacyEventSelect}`,
        {
          token: session.access_token,
        },
      );
      const [row] = rows;
      return row ? toCalendarEvent(row) : null;
    }

    if (!isMissingParticipantStatusError(error) && !isMissingCommentAuthorSnapshotError(error) && !isMissingClosedByCapacityError(error)) {
      throw error;
    }

    rows = await restRequest<CalendarEventRow[]>(
      `/calendar_events?id=eq.${eventId}&select=${legacyEventSelect}`,
      {
        token: session.access_token,
      },
    );
  }

  const [row] = rows;

  return row ? toCalendarEvent(row) : null;
}

export async function createCalendarEvent(values: CalendarEventFormValues) {
  const session = getRequiredSession();
  const ownerParticipant = await getCurrentUserParticipant(session.access_token, session.user.id);
  const [row] = await restRequest<CalendarEventRow[]>('/calendar_events', {
    method: 'POST',
    token: session.access_token,
    body: toEventPayload(values),
  });

  if (!row) {
    throw new Error('일정 생성 결과를 확인할 수 없습니다.');
  }

  await replaceParticipants(row.id, values.participantNames, session.access_token, ownerParticipant);
  return getCalendarEvent(row.id);
}

export async function updateCalendarEvent(eventId: string, values: CalendarEventFormValues) {
  const session = getRequiredSession();
  const [row] = await restRequest<CalendarEventRow[]>(`/calendar_events?id=eq.${eventId}`, {
    method: 'PATCH',
    token: session.access_token,
    body: toEventPayload(values),
  });

  if (!row) {
    throw new Error('일정 수정 결과를 확인할 수 없습니다.');
  }

  await replaceParticipants(eventId, values.participantNames, session.access_token);
  return getCalendarEvent(eventId);
}

export async function deleteCalendarEvent(eventId: string) {
  const session = getRequiredSession();

  await restRequest(`/calendar_events?id=eq.${eventId}`, {
    method: 'DELETE',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
  });
}

export async function createCalendarEventComment(eventId: string, content: string, parentId?: string | null) {
  const session = getRequiredSession();
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('댓글 내용을 입력해주세요.');
  }

  if (trimmedContent.length > 500) {
    throw new Error('댓글은 500자 이내로 입력해주세요.');
  }

  await restRequest('/calendar_event_comments', {
    method: 'POST',
    token: session.access_token,
    body: {
      event_id: eventId,
      parent_id: parentId ?? null,
      content: trimmedContent,
    },
  });

  return getCalendarEvent(eventId);
}

export async function updateCalendarEventComment(eventId: string, commentId: string, content: string) {
  const session = getRequiredSession();
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('?볤? ?댁슜???낅젰?댁＜?몄슂.');
  }

  if (trimmedContent.length > 500) {
    throw new Error('?볤?? 500???대궡濡??낅젰?댁＜?몄슂.');
  }

  await restRequest(`/calendar_event_comments?id=eq.${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
    body: {
      content: trimmedContent,
    },
  });

  return getCalendarEvent(eventId);
}

export async function deleteCalendarEventComment(eventId: string, commentId: string) {
  const session = getRequiredSession();

  await restRequest(`/calendar_event_comments?id=eq.${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
  });

  return getCalendarEvent(eventId);
}

export async function joinCalendarEvent(eventId: string) {
  const session = getRequiredSession();

  await restRequest('/rpc/join_calendar_event', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_event_id: eventId,
    },
  });

  return getCalendarEvent(eventId);
}

export async function leaveCalendarEvent(eventId: string) {
  const session = getRequiredSession();

  await restRequest('/rpc/leave_calendar_event', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_event_id: eventId,
    },
  });

  return getCalendarEvent(eventId);
}

export async function searchCalendarParticipants(keyword: string) {
  const session = getRequiredSession();
  const trimmedKeyword = keyword.trim();

  if (trimmedKeyword.length < 1) {
    return [];
  }

  return restRequest<CalendarParticipantSearchResult[]>('/rpc/search_calendar_participants', {
    method: 'POST',
    token: session.access_token,
    body: {
      p_keyword: trimmedKeyword,
    },
  });
}
