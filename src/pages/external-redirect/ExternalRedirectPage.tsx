import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ROUTES } from '../../shared/constants/routes';

function getSafeRedirectUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function ExternalRedirectPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = useMemo(() => getSafeRedirectUrl(searchParams.get('url')), [searchParams]);

  useEffect(() => {
    if (!redirectUrl) {
      return;
    }

    window.location.replace(redirectUrl);
  }, [redirectUrl]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        color: '#2f2926',
        background: '#f8f5f1',
      }}
    >
      <div style={{ maxWidth: '360px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: '1.25rem' }}>
          {redirectUrl ? 'Opening external page.' : 'This link cannot be opened.'}
        </h1>
        <p style={{ margin: '0 0 20px', color: '#6b625d', lineHeight: 1.6 }}>
          {redirectUrl ? 'Please wait a moment.' : 'Please check the link address.'}
        </p>
        <Link style={{ color: '#1d4f8f', fontWeight: 700 }} to={ROUTES.home}>
          Go home
        </Link>
      </div>
    </main>
  );
}
