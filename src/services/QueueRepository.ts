import type { Client, QueueResult, QueueSettings, QueueState } from '../types/queue';

export type QueueNotice =
  | { type: 'recovered-from-corruption' }
  | { type: 'new-day'; date: string };

/**
 * Contrato de persistência da fila.
 *
 * A interface inteira usa Promises para que uma implementação remota
 * (API REST, Supabase, Firebase…) possa substituir o localStorage sem
 * alterar nenhum componente. Para sincronização em tempo real, basta a
 * nova implementação chamar os listeners de `subscribe` quando chegar
 * uma atualização do servidor.
 */
export interface QueueRepository {
  getState(): Promise<QueueState>;
  getSettings(): Promise<QueueSettings>;
  addClient(name: string, source: Client['source']): Promise<QueueResult<Client>>;
  setServed(clientId: string, served: boolean): Promise<QueueResult<Client>>;
  removeClient(clientId: string): Promise<QueueResult<Client>>;
  resetQueue(): Promise<QueueResult<QueueState>>;
  /** Avisa quando os dados mudam (inclusive por outra aba ou, no futuro, pelo servidor). */
  subscribe(listener: (state: QueueState) => void): () => void;
  /** Avisos de sistema: dados recuperados, virada de dia etc. */
  subscribeNotices(listener: (notice: QueueNotice) => void): () => void;
  /** Verifica se o dia mudou e, se necessário, inicia uma fila vazia. */
  ensureCurrentDay(): Promise<void>;
}
