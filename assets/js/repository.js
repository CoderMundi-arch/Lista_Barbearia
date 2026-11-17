/*
 * Repositório da fila — camada de persistência.
 *
 * Esta versão usa localStorage: os dados ficam SOMENTE neste navegador/dispositivo.
 * Não há (nem é simulada) sincronização entre aparelhos diferentes. Abas do mesmo
 * navegador se mantêm atualizadas pelo evento "storage".
 *
 * Todos os métodos retornam Promises. Assim, para usar um banco de dados no futuro
 * (Supabase, Firebase, API própria…), basta criar outro objeto com os mesmos métodos
 * e trocar a linha `window.Fila.repository = ...` no final deste arquivo.
 *
 * Contrato:
 *   getState()                    → Promise<QueueState>
 *   getSettings()                 → Promise<{maxClientsPerDay}>
 *   addClient(name, source)       → Promise<{ok, client} | {ok:false, error, message}>
 *   setServed(clientId, served)   → Promise<idem>
 *   removeClient(clientId)        → Promise<idem>
 *   resetQueue()                  → Promise<{ok, state} | erro>
 *   subscribe(fn)                 → função para cancelar; fn(state) a cada mudança
 *   subscribeNotices(fn)          → avisos: {type:'recovered-from-corruption'} | {type:'new-day', date}
 *   ensureCurrentDay()            → verifica a virada do dia
 */
(function () {
  'use strict';

  var config = window.Fila.config;
  var rules = window.Fila.rules;
  var utils = window.Fila.utils;
  var KEYS = config.storageKeys;

  /** Acesso seguro ao localStorage (pode falhar em modo privado ou com cota cheia). */
  var storage = {
    read: function (key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    write: function (key, value) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  var STORAGE_ERROR = {
    ok: false,
    error: 'STORAGE_ERROR',
    message: 'Não foi possível salvar neste navegador. Verifique se o armazenamento local está habilitado.',
  };

  function createLocalStorageRepository() {
    var listeners = [];
    var noticeListeners = [];
    var pendingNotices = [];

    function emit(state) {
      listeners.forEach(function (fn) {
        fn(state);
      });
    }

    function notify(notice) {
      if (!noticeListeners.length) pendingNotices.push(notice);
      else
        noticeListeners.forEach(function (fn) {
          fn(notice);
        });
    }

    function persist(state) {
      return storage.write(KEYS.queue, JSON.stringify(state));
    }

    function readSettings() {
      var fallback = { maxClientsPerDay: config.maxClientsPerDay };
      var raw = storage.read(KEYS.settings);
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          var max = parsed && parsed.maxClientsPerDay;
          if (Number.isInteger(max) && max > 0 && max <= 500) return { maxClientsPerDay: max };
        } catch (e) {
          /* configuração inválida: volta ao padrão */
        }
      }
      storage.write(KEYS.settings, JSON.stringify(fallback));
      return fallback;
    }

    /** Lê, valida e aplica a virada de dia. Sempre retorna um estado válido. */
    function readState() {
      var raw = storage.read(KEYS.queue);
      var today = utils.todayKey();

      if (!raw) {
        var empty = rules.createEmptyQueue(today);
        persist(empty);
        return empty;
      }

      var parsed = null;
      try {
        parsed = rules.parseQueueState(JSON.parse(raw));
      } catch (e) {
        parsed = null;
      }

      if (!parsed) {
        // Guarda uma cópia do conteúdo inválido para eventual análise e recomeça.
        storage.write(KEYS.corruptedBackup, JSON.stringify({ savedAt: new Date().toISOString(), raw: raw }));
        var recovered = rules.createEmptyQueue(today);
        persist(recovered);
        notify({ type: 'recovered-from-corruption' });
        return recovered;
      }

      if (parsed.date !== today) {
        var fresh = rules.createEmptyQueue(today);
        persist(fresh);
        notify({ type: 'new-day', date: today });
        return fresh;
      }

      return parsed;
    }

    /** Aplica uma mudança sobre o estado mais recente salvo (evita sobrescrever outra aba). */
    function mutate(fn) {
      var result = fn(readState(), readSettings());
      if (!result.ok) return Promise.resolve(result);
      if (!persist(result.state)) return Promise.resolve(STORAGE_ERROR);
      emit(result.state);
      return Promise.resolve({ ok: true, client: result.client });
    }

    window.addEventListener('storage', function (event) {
      if (event.key === KEYS.queue || event.key === null) emit(readState());
    });

    return {
      getState: function () {
        return Promise.resolve(readState());
      },
      getSettings: function () {
        return Promise.resolve(readSettings());
      },
      addClient: function (name, source) {
        return mutate(function (state, settings) {
          return rules.addClient(state, name, source, settings);
        });
      },
      setServed: function (clientId, served) {
        return mutate(function (state) {
          return rules.setServed(state, clientId, served);
        });
      },
      removeClient: function (clientId) {
        return mutate(function (state) {
          return rules.removeClient(state, clientId);
        });
      },
      resetQueue: function () {
        var fresh = rules.createEmptyQueue(utils.todayKey());
        if (!persist(fresh)) return Promise.resolve(STORAGE_ERROR);
        emit(fresh);
        return Promise.resolve({ ok: true, state: fresh });
      },
      ensureCurrentDay: function () {
        var storedDate;
        try {
          var raw = storage.read(KEYS.queue);
          storedDate = raw ? JSON.parse(raw).date : undefined;
        } catch (e) {
          storedDate = undefined;
        }
        if (storedDate !== utils.todayKey()) emit(readState());
        return Promise.resolve();
      },
      subscribe: function (fn) {
        listeners.push(fn);
        return function () {
          listeners = listeners.filter(function (l) {
            return l !== fn;
          });
        };
      },
      subscribeNotices: function (fn) {
        noticeListeners.push(fn);
        pendingNotices.splice(0).forEach(fn);
        return function () {
          noticeListeners = noticeListeners.filter(function (l) {
            return l !== fn;
          });
        };
      },
    };
  }

  /* Para integrar um banco de dados no futuro, troque apenas esta linha. */
  window.Fila.repository = createLocalStorageRepository();
})();
