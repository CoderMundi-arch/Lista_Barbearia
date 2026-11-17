/* Página principal — botão de cadastro (abre janela), lista com checkbox e opção de remover. */
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
    openRegister: $('#open-register'),
    fullNotice: $('#full-notice'),
    countPill: $('#count-pill'),
    list: $('#client-list'),
    empty: $('#empty-state'),
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
      var position = current.state.clients.length;
      ui.toast('success', 'Nome cadastrado!', client.name + ' é o número ' + position + ' da lista.');
      var item = els.list.querySelector('[data-id="' + client.id + '"]');
      if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  /* ---------- Ações da lista: checkbox e remover ---------- */

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
    var id = button.closest('.client').dataset.id;
    var client = current.state.clients.find(function (c) {
      return c.id === id;
    });
    if (!client) return;

    if (button.dataset.action === 'remove') return removeClient(client);

    repo.setServed(client.id, client.status !== 'served').then(function (result) {
      if (!result.ok) ui.toast('error', 'Não foi possível atualizar', result.message);
    });
  });

  /* ---------- Renderização ---------- */

  function render() {
    var state = current.state;
    var stats = current.stats;
    if (!state) return;

    var isFull = stats.available === 0;
    els.openRegister.disabled = isFull;
    els.fullNotice.hidden = !isFull;

    els.countPill.textContent = stats.total + '/' + stats.capacity;
    els.countPill.setAttribute('aria-label', stats.total + ' de ' + stats.capacity + ' vagas preenchidas');
    els.countPill.classList.toggle('is-full', isFull);

    ui.renderDate(document, state.date);
    ui.renderClientList(els.list, state.clients, { mode: 'public', emptyEl: els.empty });
  }

  ui.connectQueue(function (state, settings, stats) {
    current.state = state;
    current.stats = stats;
    render();
  });
})();
