export type ClientStatus = 'waiting' | 'served';

export interface Client {
  id: string;
  /** Número sequencial da inscrição no dia (nunca é reutilizado). */
  number: number;
  name: string;
  status: ClientStatus;
  /** Origem da inscrição: pelo próprio cliente ou adicionado pelo barbeiro. */
  source: 'public' | 'admin';
  createdAt: string;
  servedAt: string | null;
}

export interface QueueState {
  schemaVersion: 1;
  /** Data da fila no formato YYYY-MM-DD (fuso local do dispositivo). */
  date: string;
  clients: Client[];
  /** Próximo número sequencial a ser atribuído. */
  nextNumber: number;
  updatedAt: string;
}

export interface QueueSettings {
  maxClientsPerDay: number;
}

export interface QueueStats {
  total: number;
  waiting: number;
  served: number;
  available: number;
  capacity: number;
}

/** Resultado padronizado das operações — facilita trocar o localStorage por uma API. */
export type QueueResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: QueueErrorCode; message: string };

export type QueueErrorCode =
  | 'EMPTY_NAME'
  | 'INVALID_NAME'
  | 'NAME_TOO_LONG'
  | 'INCOMPLETE_NAME'
  | 'DUPLICATE_NAME'
  | 'QUEUE_FULL'
  | 'NOT_FOUND'
  | 'STORAGE_ERROR';
