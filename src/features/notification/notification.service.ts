import type { To } from 'react-router-dom';

import { getSession, restRequest } from '../../shared/api/supabaseRest';

export type NotificationTone = 'info' | 'success' | 'warning';

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  createdAtLabel: string;
  read: boolean;
  tone: NotificationTone;
  to?: To;
};

type NotificationType =
  | 'calendar_joined'
  | 'calendar_waitlisted'
  | 'calendar_waitlist_promoted'
  | 'calendar_comment'
  | 'calendar_comment_reply'
  | 'inquiry_submitted';

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_path: string;
  read_at: string | null;
  created_at: string;
};

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요한 기능입니다.');
  }

  return session;
}

function getNotificationTone(type: NotificationType): NotificationTone {
  if (type === 'calendar_waitlist_promoted') {
    return 'success';
  }

  if (type === 'calendar_waitlisted' || type === 'inquiry_submitted') {
    return 'warning';
  }

  return 'info';
}

function formatCreatedAtLabel(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return '';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));

  if (diffSeconds < 60) {
    return '방금 전';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(createdAt));
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    description: row.message,
    createdAtLabel: formatCreatedAtLabel(row.created_at),
    read: Boolean(row.read_at),
    tone: getNotificationTone(row.type),
    to: row.link_path || '/',
  };
}

export async function getNotifications() {
  const session = getRequiredSession();
  const rows = await restRequest<NotificationRow[]>(
    '/notifications?select=id,type,title,message,link_path,read_at,created_at&order=created_at.desc&limit=30',
    {
      token: session.access_token,
    },
  );

  return rows.map(toNotification);
}

export async function markNotificationAsRead(notificationId: string) {
  const session = getRequiredSession();

  await restRequest(`/notifications?id=eq.${notificationId}`, {
    method: 'PATCH',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
    body: {
      read_at: new Date().toISOString(),
    },
  });
}

export async function markAllNotificationsAsRead(notificationIds: string[]) {
  const session = getRequiredSession();

  if (!notificationIds.length) {
    return;
  }

  await restRequest(`/notifications?id=in.(${notificationIds.join(',')})`, {
    method: 'PATCH',
    token: session.access_token,
    headers: {
      Prefer: 'return=minimal',
    },
    body: {
      read_at: new Date().toISOString(),
    },
  });
}
