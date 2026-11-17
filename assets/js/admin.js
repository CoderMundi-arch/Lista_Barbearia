/* Painel do barbeiro — mesma tela do cliente, com login (senha verificada no servidor)
   e as ações de concluir atendimento, remover, cadastrar e limpar a lista. */
(function () {
  'use strict';

  var Fila = window.Fila;
  var ui = Fila.ui;
  var repo = Fila.repository;
  var utils = Fila.utils;

  var $ = function (sel) {
    return document.querySelector(sel);
  };

  // Textos e ícones primeiro.
  ui.bindStaticTexts();
  Fila.icons.hydrate();

  var els = {
    openRegister: $('#open-register'),
    fullNotice: $('#full-notice'),
    countPill: $('#count-pill'),
    summary: $('#list-summary'),
    list: $('#client-list'),
    empty: $('#empty-state'),
    reset: $('#reset-btn'),
  };

  var current = { state: null, stats: null };

  /* =====================================================================
   * Login
   * ===================================================================== */

  var AUTH_KEY = Fila.config.storageKeys.adminAuth;
  var login = {
    view: $('#login-view'),
    adminView: $('#admin-view'),
    form: $('#login-form'),
    input: $('#password-input'),
    error: $('#login-error'),
    remember: $('#remember-input'),
    submit: $('#login-form button[type="submit"]'),
    logout: $('#logout-btn'),
  };
  var started = false;

  function storage(kind) {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch (e) {
      return null;
    }
  }
  function savedPassword() {
    var l = storage('local');
    var s = storage('session');
    return (l && l.getItem(AUTH_KEY)) || (s && s.getItem(AUTH_KEY)) || null;
  }
  function isRemembered() {
    var l = storage('local');
    return !!(l && l.getItem(AUTH_KEY));
  }
  function clearPassword() {
    ['local', 'session'].forEach(function (k) {
      var st = storage(k);
      if (st) st.removeItem(AUTH_KEY);
    });
  }
  function savePassword(pw, remember) {
    clearPassword();
    var st = storage(remember ? 'local' : 'session');
    if (st) st.setItem(AUTH_KEY, pw);
  }

  function showLogin(message) {
    login.adminView.hidden = true;
    login.logout.hidden = true;
    login.view.hidden = false;
    login.error.textContent = message || '';
    login.error.hidden = !message;
    login.input.value = '';
    login.input.focus();
  }

  function showPanel() {
    login.view.hidden = true;
    login.adminView.hidden = false;
    login.logout.hidden = false;
    if (started) return repo.refresh();
    started = true;
    ui.connectQueue(
      function (state, settings, stats) {
        current.state = state;
        current.stats = stats;
        render();
      },
      {
        pollMs: Fila.config.adminPollIntervalMs,
        onAuthExpired: function () {
          clearPassword();
          repo.logout();
          showLogin('A senha foi alterada. Entre novamente.');
        },
      },
    );
  }

  function attempt(pw, remember, silent) {
    login.submit.disabled = true;
    return repo.login(pw).then(function (res) {
      login.submit.disabled = false;
      if (res.ok) {
        savePassword(pw, remember);
        showPanel();
      } else {
        clearPassword();
        showLogin(silent && res.error !== 'NETWORK' ? '' : res.message);
      }
    });
  }

  login.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = login.input.value;
    if (!pw) return showLogin('Digite a senha.');
    attempt(pw, login.remember.checked, false);
  });

  login.logout.addEventListener('click', function () {
    clearPassword();
    repo.logout();
    showLogin('');
  });

  /* =====================================================================
   * Ações
   * ===================================================================== */

  function findClient(id) {
    return current.state.clients.find(function (c) {
      return c.id === id;
    });
  }

  function positionOf(id) {
    var pos = 0;
    current.state.clients.forEach(function (c, i) {
      if (c.id === id) pos = i + 1;
    });
    return pos;
  }

  els.openRegister.addEventListener('click', function () {
    ui.nameDialog({
      description: 'Digite o nome do cliente.',
      onSubmit: function (name) {
        return repo.addClient(name, 'admin');
      },
    }).then(function (client) {
      if (!client) return;
      ui.toast('success', 'Nome cadastrado!', client.name + ' é o número ' + (positionOf(client.id) || client.number) + ' da lista.');
    });
  });

  function toggleServed(client) {
    var served = client.status !== 'served';
    repo.setServed(client.id, served).then(function (result) {
      if (!result.ok) ui.toast('error', 'Não foi possível atualizar', result.message);
    });
  }

  function removeClient(client) {
    ui.confirmDialog({
      title: 'Remover nome da lista?',
      description: client.name + ' será removido da lista de hoje e uma vaga será liberada.',
      confirmLabel: 'Remover',
    }).then(function (confirmed) {
      if (!confirmed) return;
      repo.removeClient(client.id).then(function (result) {
        if (result.ok) ui.toast('success', 'Nome removido', client.name + ' saiu da lista.');
        else ui.toast('error', 'Não foi possível remover', result.message);
      });
    });
  }

  els.list.addEventListener('click', function (e) {
    var button = e.target.closest('[data-action]');
    if (!button || !current.state) return;
    var client = findClient(button.closest('.client').dataset.id);
    if (!client) return;
    if (button.dataset.action === 'toggle') toggleServed(client);
    if (button.dataset.action === 'remove') removeClient(client);
  });

  els.reset.addEventListener('click', function () {
    ui.confirmDialog({
      title: 'Limpar a lista de hoje?',
      description: 'Todos os ' + current.stats.total + ' nomes (aguardando e atendidos) serão apagados. Esta ação não pode ser desfeita.',
      confirmLabel: 'Limpar lista',
    }).then(function (confirmed) {
      if (!confirmed) return;
      repo.resetQueue().then(function (result) {
        if (result.ok) ui.toast('success', 'Lista limpa', 'Pronta para novos cadastros.');
        else ui.toast('error', 'Não foi possível limpar a lista', result.message);
      });
    });
  });

  /* =====================================================================
   * Renderização
   * ===================================================================== */

  function render() {
    var state = current.state;
    var stats = current.stats;
    if (!state) return;

    var isFull = stats.available === 0;
    els.openRegister.disabled = isFull;
    els.fullNotice.hidden = !isFull;
    els.reset.hidden = stats.total === 0;

    els.countPill.textContent = stats.total + '/' + stats.capacity;
    els.countPill.setAttribute('aria-label', stats.total + ' de ' + stats.capacity + ' vagas preenchidas');
    els.countPill.classList.toggle('is-full', isFull);

    els.summary.textContent =
      stats.total === 0
        ? 'Toque no quadrado ao concluir'
        : stats.waiting + ' ' + utils.plural(stats.waiting, 'aguardando', 'aguardando') + ' · ' +
          stats.served + ' ' + utils.plural(stats.served, 'atendido', 'atendidos');

    ui.renderDate(document, state.date);
    ui.renderClientList(els.list, state.clients, { mode: 'admin', emptyEl: els.empty });
  }

  /* =====================================================================
   * Início: entra direto se a senha já estiver salva neste aparelho
   * ===================================================================== */

  var stored = savedPassword();
  if (stored) {
    login.view.hidden = false;
    login.submit.textContent = 'Entrando…';
    attempt(stored, isRemembered(), true).then(function () {
      login.submit.textContent = 'Entrar';
    });
  } else {
    showLogin('');
  }
})();
