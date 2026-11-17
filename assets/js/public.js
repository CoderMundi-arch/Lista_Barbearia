/* Página do cliente — somente leitura da lista + cadastro do próprio nome (se permitido). */
(function () {
  'use strict';

  var Fila = window.Fila;
  var ui = Fila.ui;
  var repo = Fila.repository;

  var $ = function (sel) {
    return document.querySelector(sel);
  };

  // Textos e ícones primeiro.
  ui.bindStaticTexts();
  Fila.icons.hydrate();

  var els = {
    register: $('#register'),
    openRegister: $('#open-register'),
    fullNotice: $('#full-notice'),
    countPill: $('#count-pill'),
    list: $('#client-list'),
    empty: $('#empty-state'),
    emptyText: $('#empty-text'),
  };

  var current = { state: null, stats: null };

  /* ---------- Cadastro (janela) ---------- */

  els.openRegister.addEventListener('click', function () {
    ui.nameDialog({
      onSubmit: function (name) {
        return repo.addClient(name, 'public');
      },
    }).then(function (client) {
      if (!client) return;
      var position = 0;
      current.state.clients.forEach(function (c, i) {
        if (c.id === client.id) position = i + 1;
      });
      ui.toast('success', 'Nome cadastrado!', client.name + ' é o número ' + (position || client.number) + ' da lista.');
      var item = els.list.querySelector('[data-id="' + client.id + '"]');
      if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  /* ---------- Renderização ---------- */

  function render(settings) {
    var state = current.state;
    var stats = current.stats;
    if (!state) return;

    var canRegister = settings.allowPublicRegistration !== false;
    var isFull = stats.available === 0;
    els.register.hidden = !canRegister;
    els.openRegister.disabled = isFull;
    els.fullNotice.hidden = !isFull;
    els.emptyText.textContent = canRegister
      ? 'Toque em “Cadastrar nome” para entrar na lista de hoje.'
      : 'Os nomes aparecem aqui assim que forem cadastrados pela barbearia.';

    els.countPill.textContent = stats.total + '/' + stats.capacity;
    els.countPill.setAttribute('aria-label', stats.total + ' de ' + stats.capacity + ' vagas preenchidas');
    els.countPill.classList.toggle('is-full', isFull);

    ui.renderDate(document, state.date);
    ui.renderClientList(els.list, state.clients, { mode: 'public', emptyEl: els.empty });
  }

  ui.connectQueue(function (state, settings, stats) {
    current.state = state;
    current.stats = stats;
    render(settings);
  });
})();
