import { APP_CONFIG, STORAGE_KEYS } from '../config/app';
import { todayKey } from '../lib/date';
import type { Client, QueueResult, QueueSettings, QueueState } from '../types/queue';
import type { QueueNotice, QueueRepository } from './QueueRepository';
import * as rules from './queueRules';

/** Acesso seguro ao localStorage (pode falhar em modo privado ou com cota cheia). */
const storage = {
  read(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};

const STORAGE_ERROR = {
  ok: false as const,
  error: 'STORAGE_ERROR' as const,
  message: 'Não foi possível salvar neste navegador. Verifique se o armazenamento local está habilitado.',
};

/**
 * Implementação local da fila. Os dados ficam apenas neste navegador/dispositivo —
 * não há (nem é simulada) sincronização entre aparelhos diferentes.
 * Abas do mesmo navegador se mantêm atualizadas pelo evento `storage`.
 */
export class LocalStorageQueueRepository implements QueueRepository {
  private listeners = new Set<(state: QueueState) => void>();
  private noticeListeners = new Set<(notice: QueueNotice) => void>();
  private pendingNotices: QueueNotice[] = [];

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEYS.queue || event.key === null) {
        this.emit(this.readState());
      }
    });
  }

  /* ---------- Leitura ---------- */

  private readSettings(): QueueSettings {
    const fallback: QueueSettings = { maxClientsPerDay: APP_CONFIG.maxClientsPerDay };
    const raw = storage.read(STORAGE_KEYS.settings);
    if (!raw) {
      storage.write(STORAGE_KEYS.settings, JSON.stringify(fallback));
      return fallback;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<QueueSettings>;
      const max = parsed.maxClientsPerDay;
      if (typeof max === 'number' && Number.isInteger(max) && max > 0 && max <= 500) return { maxClientsPerDay: max };
    } catch {
      /* configuração inválida: volta ao padrão */
    }
    storage.write(STORAGE_KEYS.settings, JSON.stringify(fallback));
    return fallback;
  }

  /** Lê, valida e aplica a regra de virada de dia. Sempre retorna um estado válido. */
  private readState(): QueueState {
    const raw = storage.read(STORAGE_KEYS.queue);
    const today = todayKey();

    if (!raw) {
      const fresh = rules.createEmptyQueue(today);
      this.persist(fresh);
      return fresh;
    }

    let parsed: QueueState | null = null;
    try {
      parsed = rules.parseQueueState(JSON.parse(raw));
    } catch {
      parsed = null;
    }

    if (!parsed) {
      // Guarda uma cópia do conteúdo inválido para eventual análise e recomeça.
      storage.write(STORAGE_KEYS.corruptedBackup, JSON.stringify({ savedAt: new Date().toISOString(), raw }));
      const fresh = rules.createEmptyQueue(today);
      this.persist(fresh);
      this.notify({ type: 'recovered-from-corruption' });
      return fresh;
    }

    if (parsed.date !== today) {
      const fresh = rules.createEmptyQueue(today);
      this.persist(fresh);
      this.notify({ type: 'new-day', date: today });
      return fresh;
    }

    return parsed;
  }

  private persist(state: QueueState): boolean {
    return storage.write(STORAGE_KEYS.queue, JSON.stringify(state));
  }

  private emit(state: QueueState) {
    this.listeners.forEach((l) => l(state));
  }

  private notify(notice: QueueNotice) {
    if (this.noticeListeners.size === 0) this.pendingNotices.push(notice);
    else this.noticeListeners.forEach((l) => l(notice));
  }

  /** Aplica uma mutação sobre o estado mais recente salvo (evita sobrescrever outra aba). */
  private mutate(
    fn: (state: QueueState, settings: QueueSettings) => QueueResult<{ state: QueueState; client: Client }>,
  ): QueueResult<Client> {
    const result = fn(this.readState(), this.readSettings());
    if (!result.ok) return result;
    if (!this.persist(result.data.state)) return STORAGE_ERROR;
    this.emit(result.data.state);
    return { ok: true, data: result.data.client };
  }

  /* ---------- API pública ---------- */

  async getState() {
    return this.readState();
  }

  async getSettings() {
    return this.readSettings();
  }

  async addClient(name: string, source: Client['source']) {
    return this.mutate((state, settings) => rules.addClient(state, name, source, settings));
  }

  async setServed(clientId: string, served: boolean) {
    return this.mutate((state) => rules.setServed(state, clientId, served));
  }

  async removeClient(clientId: string) {
    return this.mutate((state) => rules.removeClient(state, clientId));
  }

  async resetQueue(): Promise<QueueResult<QueueState>> {
    const fresh = rules.createEmptyQueue(todayKey());
    if (!this.persist(fresh)) return STORAGE_ERROR;
    this.emit(fresh);
    return { ok: true, data: fresh };
  }

  async ensureCurrentDay() {
    const raw = storage.read(STORAGE_KEYS.queue);
    let storedDate: string | undefined;
    try {
      storedDate = raw ? (JSON.parse(raw) as { date?: string }).date : undefined;
    } catch {
      storedDate = undefined;
    }
    if (storedDate !== todayKey()) this.emit(this.readState());
  }

  subscribe(listener: (state: QueueState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeNotices(listener: (notice: QueueNotice) => void) {
    this.noticeListeners.add(listener);
    if (this.pendingNotices.length) {
      const pending = this.pendingNotices.splice(0);
      pending.forEach((n) => listener(n));
    }
    return () => {
      this.noticeListeners.delete(listener);
    };
  }
}
