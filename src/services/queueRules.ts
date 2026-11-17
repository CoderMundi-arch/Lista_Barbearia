/**
 * Regras de negócio da fila — funções puras, sem dependência de armazenamento.
 * Podem ser reutilizadas por qualquer implementação de repositório (localStorage, API, Supabase…).
 */
import { createId } from '../lib/id';
import { normalizeNameKey, validateName } from '../lib/name';
import { todayKey } from '../lib/date';
import type { Client, QueueResult, QueueSettings, QueueState, QueueStats } from '../types/queue';

export function createEmptyQueue(date: string = todayKey()): QueueState {
  return { schemaVersion: 1, date, clients: [], nextNumber: 1, updatedAt: new Date().toISOString() };
}

export function computeStats(state: QueueState, settings: QueueSettings): QueueStats {
  const served = state.clients.filter((c) => c.status === 'served').length;
  const total = state.clients.length;
  return {
    total,
    served,
    waiting: total - served,
    capacity: settings.maxClientsPerDay,
    // Atendidos continuam ocupando vaga; só a exclusão libera.
    available: Math.max(0, settings.maxClientsPerDay - total),
  };
}

/** Posição atual na fila de espera (1 = próximo). Retorna null se já foi atendido. */
export function waitingPosition(state: QueueState, clientId: string): number | null {
  const waiting = state.clients.filter((c) => c.status === 'waiting');
  const index = waiting.findIndex((c) => c.id === clientId);
  return index === -1 ? null : index + 1;
}

export function addClient(
  state: QueueState,
  rawName: string,
  source: Client['source'],
  settings: QueueSettings,
): QueueResult<{ state: QueueState; client: Client }> {
  const validation = validateName(rawName, { requireFullName: source === 'public' });
  if (!validation.ok) return validation;

  if (state.clients.length >= settings.maxClientsPerDay) {
    return {
      ok: false,
      error: 'QUEUE_FULL',
      message: `As ${settings.maxClientsPerDay} vagas de hoje já foram preenchidas.`,
    };
  }

  const key = normalizeNameKey(validation.name);
  const duplicate = state.clients.find((c) => normalizeNameKey(c.name) === key);
  if (duplicate) {
    return {
      ok: false,
      error: 'DUPLICATE_NAME',
      message: `"${duplicate.name}" já está na lista de hoje (nº ${duplicate.number}). Se for outra pessoa, inclua um sobrenome diferente.`,
    };
  }

  const now = new Date().toISOString();
  const client: Client = {
    id: createId(),
    number: state.nextNumber,
    name: validation.name,
    status: 'waiting',
    source,
    createdAt: now,
    servedAt: null,
  };

  return {
    ok: true,
    data: {
      client,
      state: { ...state, clients: [...state.clients, client], nextNumber: state.nextNumber + 1, updatedAt: now },
    },
  };
}

export function setServed(state: QueueState, clientId: string, served: boolean): QueueResult<{ state: QueueState; client: Client }> {
  const target = state.clients.find((c) => c.id === clientId);
  if (!target) return { ok: false, error: 'NOT_FOUND', message: 'Cliente não encontrado na fila.' };

  const now = new Date().toISOString();
  const updated: Client = { ...target, status: served ? 'served' : 'waiting', servedAt: served ? now : null };
  return {
    ok: true,
    data: {
      client: updated,
      state: { ...state, clients: state.clients.map((c) => (c.id === clientId ? updated : c)), updatedAt: now },
    },
  };
}

export function removeClient(state: QueueState, clientId: string): QueueResult<{ state: QueueState; client: Client }> {
  const target = state.clients.find((c) => c.id === clientId);
  if (!target) return { ok: false, error: 'NOT_FOUND', message: 'Cliente não encontrado na fila.' };
  return {
    ok: true,
    data: {
      client: target,
      state: { ...state, clients: state.clients.filter((c) => c.id !== clientId), updatedAt: new Date().toISOString() },
    },
  };
}

/* ---------- Validação de dados vindos do armazenamento ---------- */

function isClient(value: unknown): value is Client {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.number === 'number' &&
    Number.isInteger(c.number) &&
    c.number > 0 &&
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    (c.status === 'waiting' || c.status === 'served') &&
    typeof c.createdAt === 'string' &&
    (c.servedAt === null || typeof c.servedAt === 'string')
  );
}

/** Retorna um estado válido ou null se os dados estiverem corrompidos. */
export function parseQueueState(value: unknown): QueueState | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;
  if (s.schemaVersion !== 1) return null;
  if (typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return null;
  if (!Array.isArray(s.clients) || !s.clients.every(isClient)) return null;

  const clients = (s.clients as Client[]).map((c) => ({ ...c, source: c.source === 'admin' ? 'admin' : 'public' }) as Client);
  const ids = new Set(clients.map((c) => c.id));
  if (ids.size !== clients.length) return null;

  const maxNumber = clients.reduce((max, c) => Math.max(max, c.number), 0);
  const nextNumber = typeof s.nextNumber === 'number' && s.nextNumber > maxNumber ? s.nextNumber : maxNumber + 1;
  // Garante a ordem de inscrição mesmo se os dados vierem fora de ordem.
  clients.sort((a, b) => a.number - b.number);

  return {
    schemaVersion: 1,
    date: s.date,
    clients,
    nextNumber,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : new Date().toISOString(),
  };
}
