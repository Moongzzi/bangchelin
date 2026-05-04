import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();
const routerBaseName = import.meta.env.BASE_URL;

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBaseName}>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}