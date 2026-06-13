import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  deleteAdminUser,
  getAdminUsers,
  type AdminUserSummary,
} from '../../features/admin/adminUsers.api';
import { getSession } from '../../shared/api/supabaseRest';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import { Popup, type PopupAction } from '../../shared/components/popup';
import { ROUTES } from '../../shared/constants/routes';
import { colors } from '../../shared/styles/tokens/colors';
import styles from './AdminUserManagementPage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';

const approvalStatusLabels: Record<AdminUserSummary['approvalStatus'], string> = {
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '반려',
};

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

  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

function getActivityPath(userId: string) {
  return ROUTES.adminUserActivity.replace(':userId', userId);
}

export function AdminUserManagementPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUserSummary | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');

  const currentUserId = getSession()?.user.id ?? '';

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        setStatus('loading');
        setErrorMessage('');
        const nextUsers = await getAdminUsers();

        if (isMounted) {
          setUsers(nextUsers);
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '유저 목록을 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const onlineCount = useMemo(() => users.filter((user) => user.isOnline).length, [users]);

  const pageStyle = {
    '--admin-users-background': colors.background.default,
    '--admin-users-text': colors.text.primary,
    '--admin-users-muted': colors.text.tertiary,
    '--admin-users-header-background': colors.background.subtle,
    '--admin-users-border': colors.border.subtle,
    '--admin-users-brand': colors.brand.primary,
    '--admin-users-danger': colors.semantic.error,
  } as CSSProperties;

  async function handleDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingUserId(deleteTarget.id);
      setErrorMessage('');
      await deleteAdminUser(deleteTarget.id);
      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmText('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '유저 계정을 삭제하지 못했습니다.');
    } finally {
      setDeletingUserId('');
    }
  }

  const deleteConfirmKeyword = deleteTarget?.username || deleteTarget?.nickname || '';
  const canDelete = Boolean(deleteTarget)
    && deleteConfirmKeyword.length > 0
    && deleteConfirmText.trim() === deleteConfirmKeyword
    && deletingUserId !== deleteTarget?.id;

  const deleteActions: PopupAction[] = [
    {
      label: '취소',
      variant: 'outline',
      tone: 'neutral',
      onClick: () => {
        setDeleteTarget(null);
        setDeleteConfirmText('');
      },
      closeOnClick: true,
    },
    {
      label: deletingUserId ? '삭제 중' : '계정 삭제',
      tone: 'neutral',
      disabled: !canDelete,
      onClick: () => void handleDeleteUser(),
    },
  ];

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle} aria-label="유저 관리">
          <div className={styles.inner}>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>유저 관리</h1>
                <p className={styles.subtitle}>가입된 유저의 접속 상태, 마지막 접속, 활동 로그를 확인합니다.</p>
              </div>
              <div className={styles.summaryGroup} aria-label="유저 요약">
                <span className={styles.countBadge}>전체 {users.length}명</span>
                <span className={styles.countBadge}>접속 추정 {onlineCount}명</span>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.userColumn} />
                  <col className={styles.emailColumn} />
                  <col className={styles.statusColumn} />
                  <col className={styles.seenColumn} />
                  <col className={styles.logColumn} />
                  <col className={styles.actionColumn} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">유저</th>
                    <th scope="col">이메일</th>
                    <th scope="col">상태</th>
                    <th scope="col">마지막 접속</th>
                    <th scope="col">활동 로그</th>
                    <th scope="col">계정</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUserId;
                    const latestSeenAt = user.lastSeenAt || user.lastActivityAt || user.lastSignInAt;

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className={styles.userCell}>
                            <Link to={getActivityPath(user.id)} className={styles.userLink}>
                              {user.nickname}
                            </Link>
                            <span className={styles.username}>@{user.username || 'unknown'}</span>
                            {user.role === 'admin' ? <span className={styles.roleBadge}>admin</span> : null}
                          </div>
                        </td>
                        <td className={styles.mutedCell}>{user.email || '-'}</td>
                        <td>
                          <span className={user.isOnline ? styles.onlineBadge : styles.offlineBadge}>
                            {user.isOnline ? '접속 중' : '오프라인'}
                          </span>
                          <span className={styles.approvalText}>{approvalStatusLabels[user.approvalStatus]}</span>
                        </td>
                        <td className={styles.mutedCell}>{formatDateTime(latestSeenAt)}</td>
                        <td>
                          <Link to={getActivityPath(user.id)} className={styles.logLink}>
                            {user.activityCount.toLocaleString()}건 보기
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            disabled={isCurrentUser || deletingUserId === user.id}
                            onClick={() => {
                              setDeleteTarget(user);
                              setDeleteConfirmText('');
                            }}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {status === 'loading' ? (
              <p className={styles.message}>유저 목록을 불러오는 중입니다.</p>
            ) : null}

            {status === 'error' || errorMessage ? (
              <p className={styles.errorMessage} role="alert">{errorMessage}</p>
            ) : null}

            {status === 'ready' && users.length === 0 ? (
              <p className={styles.message}>현재 가입된 유저가 없습니다.</p>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />

      <Popup
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deletingUserId) {
            setDeleteTarget(null);
            setDeleteConfirmText('');
          }
        }}
        title="유저 계정 삭제"
        description="삭제된 계정은 되돌릴 수 없습니다. 계속하려면 아래 입력란에 대상 유저의 아이디를 그대로 입력하세요."
        role="alertdialog"
        actions={deleteActions}
        closeOnOverlayClick={!deletingUserId}
        closeOnEscape={!deletingUserId}
      >
        {deleteTarget ? (
          <div className={styles.deleteConfirmBody}>
            <dl className={styles.deleteTargetInfo}>
              <div>
                <dt>닉네임</dt>
                <dd>{deleteTarget.nickname}</dd>
              </div>
              <div>
                <dt>아이디</dt>
                <dd>{deleteTarget.username}</dd>
              </div>
            </dl>
            <label className={styles.confirmLabel}>
              확인 입력
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder={deleteConfirmKeyword}
                disabled={Boolean(deletingUserId)}
              />
            </label>
          </div>
        ) : null}
      </Popup>
    </div>
  );
}
