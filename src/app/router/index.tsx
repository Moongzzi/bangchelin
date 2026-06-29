import { lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';

import { getMyProfile } from '../../features/auth/auth.api';
import { HomePage } from '../../pages/home/HomePage';
import { getSession } from '../../shared/api/supabaseRest';
import { ROUTES } from '../../shared/constants/routes';

const AdminPage = lazy(() => import('../../pages/admin/AdminPage').then((module) => ({ default: module.AdminPage })));
const AdminUserManagementPage = lazy(() => import('../../pages/admin/AdminUserManagementPage').then((module) => ({ default: module.AdminUserManagementPage })));
const AdminUserActivityPage = lazy(() => import('../../pages/admin/AdminUserActivityPage').then((module) => ({ default: module.AdminUserActivityPage })));
const AdminLoungePage = lazy(() => import('../../pages/admin/AdminLoungePage').then((module) => ({ default: module.AdminLoungePage })));
const AdminLoungeContentPage = lazy(() => import('../../pages/admin/AdminLoungeContentPage').then((module) => ({ default: module.AdminLoungeContentPage })));
const AdminKakaoSharePage = lazy(() => import('../../pages/admin/AdminKakaoSharePage').then((module) => ({ default: module.AdminKakaoSharePage })));
const AdminInquiryPage = lazy(() => import('../../pages/admin/AdminInquiryPage').then((module) => ({ default: module.AdminInquiryPage })));
const AdminInquiryDetailPage = lazy(() => import('../../pages/admin/AdminInquiryDetailPage').then((module) => ({ default: module.AdminInquiryDetailPage })));
const AboutPage = lazy(() => import('../../pages/about/AboutPage').then((module) => ({ default: module.AboutPage })));
const CalendarPage = lazy(() => import('../../pages/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const DropdownPreviewPage = lazy(() => import('../../pages/dropdown-preview/DropdownPreviewPage').then((module) => ({ default: module.DropdownPreviewPage })));
const ExternalRedirectPage = lazy(() => import('../../pages/external-redirect/ExternalRedirectPage').then((module) => ({ default: module.ExternalRedirectPage })));
const InputPreviewPage = lazy(() => import('../../pages/input-preview/InputPreviewPage').then((module) => ({ default: module.InputPreviewPage })));
const LoginPage = lazy(() => import('../../pages/login/LoginPage').then((module) => ({ default: module.LoginPage })));
const LoungePage = lazy(() => import('../../pages/lounge/LoungePage').then((module) => ({ default: module.LoungePage })));
const LoungeEventPage = lazy(() => import('../../pages/lounge/LoungeEventPage').then((module) => ({ default: module.LoungeEventPage })));
const MazeMainPage = lazy(() => import('../../pages/maze/MazeMainPage').then((module) => ({ default: module.MazeMainPage })));
const MazePlayPage = lazy(() => import('../../pages/maze/MazePlayPage').then((module) => ({ default: module.MazePlayPage })));
const MazeSetCoverPage = lazy(() => import('../../pages/maze/MazeSetCoverPage').then((module) => ({ default: module.MazeSetCoverPage })));
const PopupPreviewPage = lazy(() => import('../../pages/popup-preview/PopupPreviewPage').then((module) => ({ default: module.PopupPreviewPage })));
const ProfilePage = lazy(() => import('../../pages/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const RegisterPage = lazy(() => import('../../pages/register/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ReportPage = lazy(() => import('../../pages/report/ReportPage').then((module) => ({ default: module.ReportPage })));
const SearchPreviewPage = lazy(() => import('../../pages/search-preview/SearchPreviewPage').then((module) => ({ default: module.SearchPreviewPage })));

const routeFallbackStyle = {
  minHeight: '40vh',
  display: 'grid',
  placeItems: 'center',
  color: '#6b625d',
  fontSize: '0.95rem',
} satisfies CSSProperties;

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div style={routeFallbackStyle}>페이지를 불러오는 중입니다.</div>}>{children}</Suspense>;
}

function HomeRoute() {
  const [searchParams] = useSearchParams();
  const sharedEventId = searchParams.get('event');

  if (sharedEventId) {
    return <Navigate replace to={`${ROUTES.calendar}?event=${encodeURIComponent(sharedEventId)}`} />;
  }

  return <HomePage />;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!getSession()) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate replace to={`${ROUTES.login}?redirectTo=${encodeURIComponent(redirectTo)}`} />;
  }

  return children;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function verifyAdmin() {
      if (!getSession()) {
        setStatus('denied');
        return;
      }

      try {
        const profile = await getMyProfile();

        if (isMounted) {
          setStatus(profile?.role === 'admin' ? 'allowed' : 'denied');
        }
      } catch {
        if (isMounted) {
          setStatus('denied');
        }
      }
    }

    void verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'loading') {
    return <div style={routeFallbackStyle}>페이지를 불러오는 중입니다.</div>;
  }

  if (status === 'denied') {
    return <Navigate replace to={ROUTES.home} />;
  }

  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<HomeRoute />} />
      <Route path={ROUTES.login} element={<LazyRoute><LoginPage /></LazyRoute>} />
      <Route path={ROUTES.register} element={<LazyRoute><RegisterPage /></LazyRoute>} />
      <Route path={ROUTES.about} element={<LazyRoute><AboutPage /></LazyRoute>} />
      <Route path={ROUTES.lounge} element={<LazyRoute><LoungePage /></LazyRoute>} />
      <Route path={ROUTES.loungeEvent} element={<ProtectedRoute><LazyRoute><LoungeEventPage /></LazyRoute></ProtectedRoute>} />
      <Route path={ROUTES.loungeMaze} element={<ProtectedRoute><LazyRoute><MazeMainPage /></LazyRoute></ProtectedRoute>} />
      <Route path={ROUTES.loungeMazeSet} element={<ProtectedRoute><LazyRoute><MazeSetCoverPage /></LazyRoute></ProtectedRoute>} />
      <Route path={ROUTES.loungeMazePlay} element={<ProtectedRoute><LazyRoute><MazePlayPage /></LazyRoute></ProtectedRoute>} />
      <Route path={ROUTES.calendar} element={<ProtectedRoute><LazyRoute><CalendarPage /></LazyRoute></ProtectedRoute>} />
      <Route path={ROUTES.externalRedirect} element={<LazyRoute><ExternalRedirectPage /></LazyRoute>} />
      <Route path={ROUTES.admin} element={<AdminRoute><LazyRoute><AdminPage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.adminUsers} element={<AdminRoute><LazyRoute><AdminUserManagementPage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.adminUserActivity} element={<AdminRoute><LazyRoute><AdminUserActivityPage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.adminLounge} element={<AdminRoute><LazyRoute><AdminLoungePage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.adminLoungeContent} element={<AdminRoute><LazyRoute><AdminLoungeContentPage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.adminKakaoShare} element={<AdminRoute><LazyRoute><AdminKakaoSharePage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.adminInquiries} element={<AdminRoute><LazyRoute><AdminInquiryPage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.adminInquiryDetail} element={<AdminRoute><LazyRoute><AdminInquiryDetailPage /></LazyRoute></AdminRoute>} />
      <Route path={ROUTES.dropdownPreview} element={<LazyRoute><DropdownPreviewPage /></LazyRoute>} />
      <Route path={ROUTES.inputPreview} element={<LazyRoute><InputPreviewPage /></LazyRoute>} />
      <Route path={ROUTES.popupPreview} element={<LazyRoute><PopupPreviewPage /></LazyRoute>} />
      <Route path={ROUTES.searchPreview} element={<LazyRoute><SearchPreviewPage /></LazyRoute>} />
      <Route path={ROUTES.report} element={<ProtectedRoute><LazyRoute><ReportPage /></LazyRoute></ProtectedRoute>} />
      <Route path={ROUTES.profile} element={<LazyRoute><ProfilePage /></LazyRoute>} />
      <Route path="*" element={<Navigate replace to={ROUTES.home} />} />
    </Routes>
  );
}
