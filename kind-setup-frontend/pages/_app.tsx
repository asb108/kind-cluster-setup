import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { monitorWebVitals } from '@/lib/performance';
import { registerServiceWorker } from '@/lib/register-sw';

export default function App({ Component, pageProps }: AppProps) {
  // Initialize performance monitoring and service worker
  useEffect(() => {
    // Only in production
    if (process.env.NODE_ENV === 'production') {
      // Monitor web vitals
      monitorWebVitals();

      // Register service worker
      registerServiceWorker();
    }
  }, []);

  return <Component {...pageProps} />;
}
