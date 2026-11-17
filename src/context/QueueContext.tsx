import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { APP_CONFIG } from '../config/app';
import { computeStats, createEmptyQueue } from '../services/queueRules';
import type { QueueNotice, QueueRepository } from '../services/QueueRepository';
import type { Client, QueueResult, QueueSettings, QueueState, QueueStats } from '../types/queue';

interface QueueContextValue {
  state: QueueState;
  settings: QueueSettings;
  stats: QueueStats;
  ready: boolean;
  addClient: (name: string, source: Client['source']) => Promise<QueueResult<Client>>;
  setServed: (clientId: string, served: boolean) => Promise<QueueResult<Client>>;
  removeClient: (clientId: string) => Promise<QueueResult<Client>>;
  resetQueue: () => Promise<QueueResult<QueueState>>;
}

const QueueContext = createContext<QueueContextValue | null>(null);

interface QueueProviderProps {
  repository: QueueRepository;
  onNotice?: (notice: QueueNotice) => void;
  children: ReactNode;
}

export function QueueProvider({ repository, onNotice, children }: QueueProviderProps) {
  const [state, setState] = useState<QueueState>(() => createEmptyQueue());
  const [settings, setSettings] = useState<QueueSettings>({ maxClientsPerDay: APP_CONFIG.maxClientsPerDay });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = repository.subscribe((next) => active && setState(next));
    const unsubscribeNotices = repository.subscribeNotices((n) => onNotice?.(n));

    Promise.all([repository.getState(), repository.getSettings()]).then(([s, cfg]) => {
      if (!active) return;
      setState(s);
      setSettings(cfg);
      setReady(true);
    });

    // Virada de dia com a página aberta: checa periodicamente e ao voltar para a aba.
    const check = () => void repository.ensureCurrentDay();
    const interval = window.setInterval(check, APP_CONFIG.dayCheckIntervalMs);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);

    return () => {
      active = false;
      unsubscribe();
      unsubscribeNotices();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [repository, onNotice]);

  const addClient = useCallback((name: string, source: Client['source']) => repository.addClient(name, source), [repository]);
  const setServed = useCallback((id: string, served: boolean) => repository.setServed(id, served), [repository]);
  const removeClient = useCallback((id: string) => repository.removeClient(id), [repository]);
  const resetQueue = useCallback(() => repository.resetQueue(), [repository]);

  const value = useMemo<QueueContextValue>(
    () => ({
      state,
      settings,
      stats: computeStats(state, settings),
      ready,
      addClient,
      setServed,
      removeClient,
      resetQueue,
    }),
    [state, settings, ready, addClient, setServed, removeClient, resetQueue],
  );

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue deve ser usado dentro de <QueueProvider>.');
  return ctx;
}
