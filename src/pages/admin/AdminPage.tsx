import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  getAdminSignUpRequests,
  updateSignUpRequestStatus,
  type AdminSignUpRequest,
} from '../../features/auth/auth.api';
import { AdminHeader } from '../../shared/components/layout/AdminHeader';
import { Footer } from '../../shared/components/layout/Footer';
import { colors } from '../../shared/styles/tokens/colors';
import styles from './AdminPage.module.css';

type PageStatus = 'loading' | 'ready' | 'error';

const statusLabelMap: Record<AdminSignUpRequest['status'], string> = {
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '반려',
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

export function AdminPage() {
  const [requests, setRequests] = useState<AdminSignUpRequest[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        setStatus('loading');
        const nextRequests = await getAdminSignUpRequests();

        if (isMounted) {
          setRequests(nextRequests);
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : '회원가입 요청 목록을 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests],
  );

  const pageStyle = {
    '--admin-account-background': colors.background.default,
    '--admin-account-text': colors.text.primary,
    '--admin-account-muted': colors.text.tertiary,
    '--admin-account-header-background': colors.background.subtle,
    '--admin-account-button': colors.brand.primary,
    '--admin-account-button-hover': colors.brand.primaryHover,
    '--admin-account-button-text': colors.text.onPrimary,
    '--admin-account-border': colors.border.subtle,
    '--admin-account-error': colors.semantic.error,
  } as CSSProperties;

  async function handleStatusChange(requestId: string, nextStatus: 'approved' | 'rejected') {
    try {
      setProcessingId(requestId);
      setErrorMessage('');
      const updatedRequest = await updateSignUpRequestStatus(requestId, nextStatus);

      setRequests((currentRequests) => currentRequests.map((request) => (
        request.id === requestId ? updatedRequest : request
      )));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '회원가입 요청을 처리하지 못했습니다.');
    } finally {
      setProcessingId('');
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <AdminHeader />
      <main>
        <section className={styles.page} style={pageStyle} aria-label="계정 인증">
          <div className={styles.inner}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>계정 인증</h1>
              <span className={styles.countBadge}>대기 {pendingCount}건</span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.nicknameColumn} />
                  <col className={styles.usernameColumn} />
                  <col className={styles.emailColumn} />
                  <col className={styles.dateColumn} />
                  <col className={styles.statusColumn} />
                  <col className={styles.actionColumn} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">닉네임</th>
                    <th scope="col">아이디</th>
                    <th scope="col">이메일</th>
                    <th scope="col">요청일</th>
                    <th scope="col">상태</th>
                    <th scope="col">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const isPending = request.status === 'pending';
                    const isProcessing = processingId === request.id;

                    return (
                      <tr key={request.id}>
                        <td>{request.nickname}</td>
                        <td>{request.username}</td>
                        <td className={styles.mutedCell}>{request.email || '-'}</td>
                        <td className={styles.mutedCell}>{formatDate(request.requestedAt)}</td>
                        <td>{statusLabelMap[request.status]}</td>
                        <td>
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={styles.approveButton}
                              disabled={!isPending || isProcessing}
                              onClick={() => void handleStatusChange(request.id, 'approved')}
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              className={styles.rejectButton}
                              disabled={!isPending || isProcessing}
                              onClick={() => void handleStatusChange(request.id, 'rejected')}
                            >
                              반려
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {status === 'loading' ? (
              <p className={styles.message}>회원가입 요청 목록을 불러오는 중입니다.</p>
            ) : null}

            {status === 'error' || errorMessage ? (
              <p className={styles.errorMessage} role="alert">{errorMessage}</p>
            ) : null}

            {status === 'ready' && requests.length === 0 ? (
              <p className={styles.message}>현재 승인 대기 중인 회원가입 요청이 없습니다.</p>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
