import { Navigate, Route, Routes } from 'react-router-dom';

import { AboutPage } from '../../pages/about/AboutPage';
import { CalendarPage } from '../../pages/calendar/CalendarPage';
import { HomePage } from '../../pages/home/HomePage';
import { LoginPage } from '../../pages/login/LoginPage';
import { ProfilePage } from '../../pages/profile/ProfilePage';
import { RegisterPage } from '../../pages/register/RegisterPage';
import { ReportPage } from '../../pages/report/ReportPage';
import { ROUTES } from '../../shared/constants/routes';

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<HomePage />} />
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.register} element={<RegisterPage />} />
      <Route path={ROUTES.about} element={<AboutPage />} />
      <Route path={ROUTES.calendar} element={<CalendarPage />} />
      <Route path={ROUTES.report} element={<ReportPage />} />
      <Route path={ROUTES.profile} element={<ProfilePage />} />
      <Route path="*" element={<Navigate replace to={ROUTES.home} />} />
    </Routes>
  );
}