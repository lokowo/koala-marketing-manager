'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface GmailState {
  connected: boolean;
  gmail_address: string | null;
  token_expired: boolean;
  loading: boolean;
}

interface GmailContextValue extends GmailState {
  checkStatus: () => Promise<void>;
  connectUrl: (returnTo?: string) => string;
}

const GmailContext = createContext<GmailContextValue>({
  connected: false,
  gmail_address: null,
  token_expired: false,
  loading: true,
  checkStatus: async () => {},
  connectUrl: () => '/api/auth/gmail/connect',
});

export function useGmail() {
  return useContext(GmailContext);
}

export function GmailProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GmailState>({
    connected: false,
    gmail_address: null,
    token_expired: false,
    loading: true,
  });

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/gmail/status');
      if (!res.ok) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }
      const data = await res.json();
      setState({
        connected: data.connected ?? false,
        gmail_address: data.gmail_address ?? null,
        token_expired: data.token_expired ?? false,
        loading: false,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkStatus();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const gmailParam = params.get('gmail');
      if (gmailParam === 'connected') {
        checkStatus();
        const url = new URL(window.location.href);
        url.searchParams.delete('gmail');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [checkStatus]);

  const connectUrl = useCallback((returnTo?: string) => {
    const path = returnTo || (typeof window !== 'undefined' ? window.location.pathname : '/koala/chat');
    return `/api/auth/gmail/connect?return_to=${encodeURIComponent(path)}`;
  }, []);

  return (
    <GmailContext.Provider value={{ ...state, checkStatus, connectUrl }}>
      {children}
    </GmailContext.Provider>
  );
}
