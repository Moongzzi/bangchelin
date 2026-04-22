import { AppProviders } from './providers';
import { AppRouter } from './router';
import './styles/globals.css';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}