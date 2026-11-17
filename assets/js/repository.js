/*
 * Repositório da fila — camada de dados.
 *
 * Dois modos, escolhidos automaticamente por config.apiUrl:
 *  - "remote": planilha do Google via Apps Script (base compartilhada entre
 *    todos os aparelhos). As regras e a senha são verificadas no servidor.
 *  - "demo": localStorage, só neste navegador (usado quando apiUrl está vazio).
 *
 * Contrato comum (todos os métodos assíncronos retornam Promise):
 *   mode                          'remote' | 'demo'
 *   getState() / getSettings()    estado atual / {maxClientsPerDay, allowPublicRegistration}
 *   refresh()                     busca a versão mais recente (remote)
 *   addClient(name, source)       source: 'public' | 'admin'
 *   setServed(id, served)         somente barbeiro
 *   removeClient(id)              somente barbeiro
 *   resetQueue()                  somente barbeiro
 *   login(password)               valida a senha do barbeiro e passa a usá-la
 *   logout()
 *   subscribe(fn) / subscribeNotices(fn)
 *   ensureCurrentDay()
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

    var authorized = false;
    var DENIED = { ok: false, error: 'NOT_AUTHORIZED', message: 'Entre com a senha do barbeiro.' };
    function adminOnly(fn) {
      return authorized ? fn() : Promise.resolve(DENIED);
    }

    return {
      mode: 'demo',
      getState: function () {
        return Promise.resolve(readState());
      },
      getSettings: function () {
        return Promise.resolve(Object.assign({ allowPublicRegistration: true }, readSettings()));
      },
      refresh: function () {
        emit(readState());
        return Promise.resolve();
      },
      login: function (password) {
        authorized = password === config.demoPassword;
        return Promise.resolve(authorized ? { ok: true } : { ok: false, error: 'SENHA_INVALIDA', message: 'Senha incorreta.' });
      },
      logout: function () {
        authorized = false;
      },
      addClient: function (name, source) {
        if (source === 'admin' && !authorized) return Promise.resolve(DENIED);
        return mutate(function (state, settings) {
          return rules.addClient(state, name, source, settings);
        });
      },
      setServed: function (clientId, served) {
        return adminOnly(function () {
          return mutate(function (state) {
            return rules.setServed(state, clientId, served);
          });
        });
      },
      removeClient: function (clientId) {
        return adminOnly(function () {
          return mutate(function (state) {
            return rules.removeClient(state, clientId);
          });
        });
      },
      resetQueue: function () {
        return adminOnly(function () {
          var fresh = rules.createEmptyQueue(utils.todayKey());
          if (!persist(fresh)) return Promise.resolve(STORAGE_ERROR);
          emit(fresh);
          return Promise.resolve({ ok: true, state: fresh });
        });
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

  /* =====================================================================
   * Modo "remote": planilha do Google (Apps Script)
   * ===================================================================== */

  var NETWORK_ERROR = {
    ok: false,
    error: 'NETWORK',
    message: 'Sem conexão com a lista. Verifique a internet e tente novamente.',
  };

  function createRemoteRepository(apiUrl) {
    var listeners = [];
    var noticeListeners = [];
    var pendingNotices = [];
    var password = null;
    var state = null;
    var settings = { maxClientsPerDay: config.maxClientsPerDay, allowPublicRegistration: true };
    var online = true;
    var firstLoad = null;
    // Controle de concorrência: respostas de leitura antigas não sobrescrevem uma ação recente.
    var mutationSeq = 0;
    var inFlightMutations = 0;

    function emit() {
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
    function setOnline(value) {
      if (online === value) return;
      online = value;
      notify({ type: value ? 'online' : 'offline' });
    }

    /** Requisições "simples" (sem preflight), formato aceito pelo Apps Script. */
    function request(payload) {
      var init = payload
        ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }
        : { method: 'GET' };
      var url = payload ? apiUrl : apiUrl + (apiUrl.indexOf('?') === -1 ? '?' : '&') + 'action=list&_=' + Date.now();
      init.cache = 'no-store';
      init.redirect = 'follow';
      return fetch(url, init)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          setOnline(true);
          return data && typeof data === 'object' ? data : NETWORK_ERROR;
        })
        .catch(function () {
          setOnline(false);
          return NETWORK_ERROR;
        });
    }

    function normalize(data) {
      var clients = (Array.isArray(data.clients) ? data.clients : []).map(function (c) {
        return {
          id: String(c.id),
          number: Number(c.position) || 0,
          name: String(c.name),
          status: c.status === 'served' ? 'served' : 'waiting',
          source: c.source === 'admin' ? 'admin' : 'public',
          createdAt: c.createdAt || null,
          servedAt: c.servedAt || null,
        };
      });
      return {
        schemaVersion: 1,
        date: typeof data.date === 'string' ? data.date : utils.todayKey(),
        clients: clients,
        nextNumber: clients.length + 1,
        updatedAt: new Date().toISOString(),
      };
    }

    function sameState(a, b) {
      if (!a || !b || a.date !== b.date || a.clients.length !== b.clients.length) return false;
      for (var i = 0; i < a.clients.length; i++) {
        var x = a.clients[i];
        var y = b.clients[i];
        if (x.id !== y.id || x.status !== y.status || x.name !== y.name || x.servedAt !== y.servedAt) return false;
      }
      return true;
    }

    function refresh() {
      var seqAtStart = mutationSeq;
      var payload = password ? { action: 'adminList', password: password } : null;
      return request(payload).then(function (data) {
        if (!data.ok) {
          if (data.error === 'SENHA_INVALIDA') notify({ type: 'auth-expired' });
          return data;
        }
        settings = {
          maxClientsPerDay: Number(data.capacity) || config.maxClientsPerDay,
          allowPublicRegistration: data.allowPublicRegistration !== false,
        };
        // Uma ação do barbeiro aconteceu enquanto esta leitura viajava: descarta a leitura.
        if (seqAtStart !== mutationSeq || inFlightMutations > 0) return data;

        var next = normalize(data);
        if (state && state.date !== next.date) notify({ type: 'new-day', date: next.date });
        if (!sameState(state, next)) {
          state = next;
          emit();
        }
        return data;
      });
    }

    function ensureLoaded() {
      if (!firstLoad) {
        firstLoad = refresh().then(function () {
          if (!state) state = rules.createEmptyQueue(utils.todayKey());
          return state;
        });
      }
      return firstLoad;
    }

    /** Aplica a mudança na tela na hora e confirma com o servidor (desfaz se falhar). */
    function optimistic(localChange, payload) {
      var before = state;
      var local = localChange(state);
      if (!local.ok) return Promise.resolve(local);
      mutationSeq++;
      inFlightMutations++;
      state = local.state;
      emit();
      return request(payload).then(function (res) {
        inFlightMutations--;
        mutationSeq++;
        if (!res.ok) {
          state = before;
          emit();
        }
        refresh();
        return res.ok ? { ok: true, client: local.client } : res;
      });
    }

    function adminPayload(extra) {
      return Object.assign({ password: password }, extra);
    }

    return {
      mode: 'remote',
      getState: function () {
        return ensureLoaded().then(function () {
          return state;
        });
      },
      getSettings: function () {
        return ensureLoaded().then(function () {
          return settings;
        });
      },
      refresh: refresh,
      addClient: function (name, source) {
        // Validação rápida no aparelho; a validação que vale é a do servidor.
        var check = rules.addClient(state || rules.createEmptyQueue(), name, source, settings);
        if (!check.ok) return Promise.resolve(check);
        var payload = source === 'admin' ? adminPayload({ action: 'adminAdd', name: name }) : { action: 'add', name: name };
        mutationSeq++;
        inFlightMutations++;
        return request(payload).then(function (res) {
          inFlightMutations--;
          mutationSeq++;
          if (!res.ok) return res;
          return refresh().then(function () {
            var c = res.client || {};
            return { ok: true, client: { id: String(c.id), number: Number(c.position) || 0, name: String(c.name) } };
          });
        });
      },
      setServed: function (clientId, served) {
        return optimistic(
          function (s) {
            return rules.setServed(s, clientId, served);
          },
          adminPayload({ action: 'setServed', id: clientId, served: served }),
        );
      },
      removeClient: function (clientId) {
        return optimistic(
          function (s) {
            var result = rules.removeClient(s, clientId);
            if (result.ok) {
              result.state.clients = result.state.clients.map(function (c, i) {
                return Object.assign({}, c, { number: i + 1 });
              });
            }
            return result;
          },
          adminPayload({ action: 'remove', id: clientId }),
        );
      },
      resetQueue: function () {
        return optimistic(
          function (s) {
            var fresh = rules.createEmptyQueue(s ? s.date : utils.todayKey());
            return { ok: true, state: fresh, client: null };
          },
          adminPayload({ action: 'reset' }),
        );
      },
      login: function (pw) {
        return request({ action: 'login', password: pw }).then(function (res) {
          if (res.ok) {
            password = pw;
            firstLoad = null;
          }
          return res;
        });
      },
      logout: function () {
        password = null;
      },
      ensureCurrentDay: function () {
        return refresh();
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

  /* Escolhe o modo: com apiUrl configurado usa a planilha; sem ele, demonstração local. */
  window.Fila.repository = config.apiUrl ? createRemoteRepository(config.apiUrl) : createLocalStorageRepository();
})();
