/*
 * Regras de negócio da fila — funções puras, sem dependência de armazenamento.
 * Podem ser reaproveitadas por qualquer forma de persistência (localStorage, API, Supabase…).
 *
 * Formato dos dados:
 *   QueueState = { schemaVersion: 1, date: 'YYYY-MM-DD', clients: Client[], nextNumber: number, updatedAt: string }
 *   Client     = { id, number, name, status: 'waiting' | 'served', source: 'public' | 'admin', createdAt, servedAt }
 */
(function () {
  'use strict';

  var utils = window.Fila.utils;

  function createEmptyQueue(date) {
    return {
      schemaVersion: 1,
      date: date || utils.todayKey(),
      clients: [],
      nextNumber: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  function computeStats(state, settings) {
    var served = state.clients.filter(function (c) {
      return c.status === 'served';
    }).length;
    var total = state.clients.length;
    return {
      total: total,
      served: served,
      waiting: total - served,
      capacity: settings.maxClientsPerDay,
      // Atendidos continuam ocupando a vaga; só a exclusão libera.
      available: Math.max(0, settings.maxClientsPerDay - total),
    };
  }

  /** Posição atual entre os que aguardam (1 = próximo). null se já foi atendido ou não existe. */
  function waitingPosition(state, clientId) {
    var waiting = state.clients.filter(function (c) {
      return c.status === 'waiting';
    });
    for (var i = 0; i < waiting.length; i++) if (waiting[i].id === clientId) return i + 1;
    return null;
  }

  function firstWaitingId(state) {
    for (var i = 0; i < state.clients.length; i++) if (state.clients[i].status === 'waiting') return state.clients[i].id;
    return null;
  }

  function fail(error, message) {
    return { ok: false, error: error, message: message };
  }

  function addClient(state, rawName, source, settings) {
    var validation = utils.validateName(rawName, { requireFullName: source === 'public' });
    if (!validation.ok) return validation;

    if (state.clients.length >= settings.maxClientsPerDay) {
      return fail('QUEUE_FULL', 'As ' + settings.maxClientsPerDay + ' vagas de hoje já foram preenchidas.');
    }

    var key = utils.normalizeNameKey(validation.name);
    var duplicate = state.clients.find(function (c) {
      return utils.normalizeNameKey(c.name) === key;
    });
    if (duplicate) {
      return fail(
        'DUPLICATE_NAME',
        '"' + duplicate.name + '" já está na lista de hoje (nº ' + duplicate.number + '). Se for outra pessoa, inclua um sobrenome diferente.',
      );
    }

    var now = new Date().toISOString();
    var client = {
      id: utils.createId(),
      number: state.nextNumber,
      name: validation.name,
      status: 'waiting',
      source: source,
      createdAt: now,
      servedAt: null,
    };

    return {
      ok: true,
      client: client,
      state: Object.assign({}, state, {
        clients: state.clients.concat([client]),
        nextNumber: state.nextNumber + 1,
        updatedAt: now,
      }),
    };
  }

  function setServed(state, clientId, served) {
    var target = state.clients.find(function (c) {
      return c.id === clientId;
    });
    if (!target) return fail('NOT_FOUND', 'Cliente não encontrado na fila.');

    var now = new Date().toISOString();
    var updated = Object.assign({}, target, { status: served ? 'served' : 'waiting', servedAt: served ? now : null });
    return {
      ok: true,
      client: updated,
      state: Object.assign({}, state, {
        clients: state.clients.map(function (c) {
          return c.id === clientId ? updated : c;
        }),
        updatedAt: now,
      }),
    };
  }

  function removeClient(state, clientId) {
    var target = state.clients.find(function (c) {
      return c.id === clientId;
    });
    if (!target) return fail('NOT_FOUND', 'Cliente não encontrado na fila.');
    return {
      ok: true,
      client: target,
      state: Object.assign({}, state, {
        clients: state.clients.filter(function (c) {
          return c.id !== clientId;
        }),
        updatedAt: new Date().toISOString(),
      }),
    };
  }

  /* ---------- Validação dos dados vindos do armazenamento ---------- */

  function isClient(c) {
    return (
      !!c &&
      typeof c === 'object' &&
      typeof c.id === 'string' &&
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
  function parseQueueState(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.schemaVersion !== 1) return null;
    if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
    if (!Array.isArray(value.clients) || !value.clients.every(isClient)) return null;

    var ids = {};
    for (var i = 0; i < value.clients.length; i++) {
      if (ids[value.clients[i].id]) return null;
      ids[value.clients[i].id] = true;
    }

    var clients = value.clients
      .map(function (c) {
        return {
          id: c.id,
          number: c.number,
          name: c.name,
          status: c.status,
          source: c.source === 'admin' ? 'admin' : 'public',
          createdAt: c.createdAt,
          servedAt: c.servedAt,
        };
      })
      // Garante a ordem de inscrição mesmo se os dados vierem fora de ordem.
      .sort(function (a, b) {
        return a.number - b.number;
      });

    var maxNumber = clients.reduce(function (max, c) {
      return Math.max(max, c.number);
    }, 0);

    return {
      schemaVersion: 1,
      date: value.date,
      clients: clients,
      nextNumber: typeof value.nextNumber === 'number' && value.nextNumber > maxNumber ? value.nextNumber : maxNumber + 1,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    };
  }

  window.Fila.rules = {
    createEmptyQueue: createEmptyQueue,
    computeStats: computeStats,
    waitingPosition: waitingPosition,
    firstWaitingId: firstWaitingId,
    addClient: addClient,
    setServed: setServed,
    removeClient: removeClient,
    parseQueueState: parseQueueState,
  };
})();
