import { lazy, Suspense, type CSSProperties } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { HomePage } from '../../pages/home/HomePage';
import { getSession } from '../../shared/api/supabaseRest';
import { ROUTES } from '../../shared/constants/routes';

const AboutPage = lazy(() => import('../../pages/about/AboutPage').then((module) => ({ default: module.AboutPage })));
const CalendarPage = lazy(() => import('../../pages/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const DropdownPreviewPage = lazy(() => import('../../pages/dropdown-preview/DropdownPreviewPage').then((module) => ({ default: module.DropdownPreviewPage })));
const InputPreviewPage = lazy(() => import('../../pages/input-preview/InputPreviewPage').then((module) => ({ default: module.InputPreviewPage })));
const LoginPage = lazy(() => import('../../pages/login/LoginPage').then((module) => ({ default: module.LoginPage })));
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

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={routeFallbackStyle}>페이지를 불러오는 중입니다.</div>}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getSession()) {
    return <Navigate replace to={ROUTES.home} />;
  }

  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<HomePage />} />
      <Route path={ROUTES.login} element={<LazyRoute><LoginPage /></LazyRoute>} />
      <Route path={ROUTES.register} element={<LazyRoute><RegisterPage /></LazyRoute>} />
      <Route path={ROUTES.about} element={<LazyRoute><AboutPage /></LazyRoute>} />
      <Route path={ROUTES.calendar} element={<ProtectedRoute><LazyRoute><CalendarPage /></LazyRoute></ProtectedRoute>} />
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
