import { AppProviders } from './providers';
import { AppRouter } from './router';
import { ThemeVariables } from './styles/ThemeVariables';
import './styles/globals.css';

export function App() {
  return (
    <>
      <ThemeVariables />
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </>
  );
}