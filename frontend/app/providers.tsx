'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { I18nProvider } from '@/lib/i18n/i18n-provider';
import { ThemeProvider } from '@/lib/theme/theme-provider';
import { Toaster } from 'sonner';
import { useTheme } from '@/lib/theme/theme-provider';

function ThemeAwareToaster() {
  const { resolved } = useTheme();
  return <Toaster position="top-right" theme={resolved} richColors />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemeAwareToaster />
          <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
