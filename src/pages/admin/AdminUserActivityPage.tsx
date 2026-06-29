import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getAdminUser,
  getAdminUserActivityLogs,
  type AdminUserActivityLog,
  type AdminUserSummary,
} from '../../features/admin/adminUsers.api';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import { ROUTES } from '../../shared/constants/routes';
import { colors } from '../../shared/styles/tokens/colors';
import styles from './AdminUserActivityPage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';

const pageSize = 50;

function formatDateTime(value: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

function getReadableAction(log: AdminUserActivityLog) {
  if (log.actionType.includes('calendar_events.create') || log.actionType === 'calendar_events.INSERT') {
    return '일정 생성';
  }

  if (log.actionType.includes('calendar_events.update') || log.actionType === 'calendar_events.UPDATE') {
    return '일정 수정';
  }

  if (log.actionType.includes('calendar_events.delete') || log.actionType === 'calendar_events.DELETE') {
    return '일정 삭제';
  }

  if (log.actionType.includes('profiles.update') || log.actionType === 'profiles.UPDATE') {
    return '프로필 변경';
  }

  if (log.actionType.includes('inquiries.create') || log.actionType === 'inquiries.INSERT') {
    return '문의 등록';
  }

  if (log.actionType.includes('guide_documents') || log.entityType === 'guide_documents') {
    return '가이드 문서 작업';
  }

  return log.actionType;
}

export function AdminUserActivityPage() {
  const { userId = '' } = useParams();
  const [user, setUser] = useState<AdminUserSummary | null>(null);
  const [logs, setLogs] = useState<AdminUserActivityLog[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      if (!userId) {
        setStatus('error');
        setErrorMessage('유저 정보를 찾을 수 없습니다.');
        return;
      }

      try {
        setStatus('loading');
        setErrorMessage('');
        const [nextUser, nextLogs] = await Promise.all([
          getAdminUser(userId),
          getAdminUserActivityLogs(userId, 0, pageSize),
        ]);

        if (isMounted) {
          setUser(nextUser);
          setLogs(nextLogs);
          setPage(0);
          setHasMore(nextLogs.length === pageSize);
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '활동 로그를 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const pageStyle = {
    '--admin-activity-background': colors.background.default,
    '--admin-activity-text': colors.text.primary,
    '--admin-activity-muted': colors.text.tertiary,
    '--admin-activity-header-background': colors.background.subtle,
    '--admin-activity-border': colors.border.subtle,
    '--admin-activity-brand': colors.brand.primary,
    '--admin-activity-error': colors.semantic.error,
  } as CSSProperties;

  const pageTitle = useMemo(() => {
    if (!user) {
      return '활동 로그';
    }

    return `${user.nickname} 활동 로그`;
  }, [user]);

  async function handleLoadMore() {
    if (!userId || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setErrorMessage('');
      const nextPage = page + 1;
      const nextLogs = await getAdminUserActivityLogs(userId, nextPage, pageSize);

      setLogs((currentLogs) => [...currentLogs, ...nextLogs]);
      setPage(nextPage);
      setHasMore(nextLogs.length === pageSize);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '추가 활동 로그를 불러오지 못했습니다.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle} aria-label="유저 활동 로그">
          <div className={styles.inner}>
            <Link to={ROUTES.adminUsers} className={styles.backLink}>유저 관리로 돌아가기</Link>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>{pageTitle}</h1>
                {user ? (
                  <p className={styles.subtitle}>
                    @{user.username || 'unknown'} · {user.email || '이메일 없음'}
                  </p>
                ) : (
                  <p className={styles.subtitle}>유저 정보가 삭제되었거나 조회 권한이 없습니다.</p>
                )}
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.timeColumn} />
                  <col className={styles.actionColumn} />
                  <col className={styles.targetColumn} />
                  <col className={styles.resultColumn} />
                  <col className={styles.pathColumn} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">시간</th>
                    <th scope="col">활동</th>
                    <th scope="col">대상</th>
                    <th scope="col">결과</th>
                    <th scope="col">페이지</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className={styles.mutedCell}>{formatDateTime(log.createdAt)}</td>
                      <td>
                        <div className={styles.actionCell}>
                          <span>{getReadableAction(log)}</span>
                          <span className={styles.rawAction}>{log.actionType}</span>
                        </div>
                      </td>
                      <td className={styles.mutedCell}>
                        {[log.entityType, log.entityId].filter(Boolean).join(' · ') || '-'}
                      </td>
                      <td>
                        <span className={log.success ? styles.successBadge : styles.failBadge}>
                          {log.success ? '성공' : '실패'}
                        </span>
                        {log.httpStatus ? <span className={styles.httpStatus}>{log.httpStatus}</span> : null}
                      </td>
                      <td className={styles.mutedCell}>{log.pagePath || log.endpoint || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {status === 'loading' ? (
              <p className={styles.message}>활동 로그를 불러오는 중입니다.</p>
            ) : null}

            {status === 'error' || errorMessage ? (
              <p className={styles.errorMessage} role="alert">{errorMessage}</p>
            ) : null}

            {status === 'ready' && logs.length === 0 ? (
              <p className={styles.message}>표시할 활동 로그가 없습니다.</p>
            ) : null}

            {status === 'ready' && hasMore ? (
              <div className={styles.moreRow}>
                <button type="button" className={styles.moreButton} disabled={isLoadingMore} onClick={() => void handleLoadMore()}>
                  {isLoadingMore ? '불러오는 중' : '더 보기'}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
