/* Painel do barbeiro — controla os atendimentos do dia. */
(function () {
  'use strict';

  var Fila = window.Fila;
  var ui = Fila.ui;
  var rules = Fila.rules;
  var repo = Fila.repository;

  var $ = function (sel) {
    return document.querySelector(sel);
  };

  var els = {
    summary: $('#summary'),
    dayProgress: $('#day-progress'),
    capacity: $('#capacity'),
    resetBtn: $('#reset-btn'),
    form: $('#admin-form'),
    fullNotice: $('#full-notice'),
    tabs: $('#tabs'),
    list: $('#client-list'),
    empty: $('#empty-state'),
    emptyTitle: $('#empty-title'),
    emptyDesc: $('#empty-desc'),
  };

  // Textos e ícones primeiro: o formulário guarda o HTML do botão já com o ícone.
  ui.bindStaticTexts();
  Fila.icons.hydrate();

  var current = { state: null, stats: null };
  var filter = 'all';

  /* ---------- Ações ---------- */

  function findClient(id) {
    return current.state.clients.find(function (c) {
      return c.id === id;
    });
  }

  function toggleServed(client) {
    var served = client.status !== 'served';
    repo.setServed(client.id, served).then(function (result) {
      if (!result.ok) return ui.toast('error', 'Não foi possível atualizar', result.message);
      if (served) ui.toast('success', client.name + ' atendido');
      else ui.toast('info', 'Atendimento desmarcado', client.name + ' voltou para "Aguardando".');
    });
  }

  function removeClient(client) {
    ui.confirmDialog({
      title: 'Remover cliente da fila?',
      description:
        client.name + ' será removido da lista de hoje e uma vaga será liberada.',
      confirmLabel: 'Remover cliente',
    }).then(function (confirmed) {
      if (!confirmed) return;
      repo.removeClient(client.id).then(function (result) {
        if (result.ok) ui.toast('success', 'Cliente removido', client.name + ' saiu da fila. Uma vaga foi liberada.');
        else ui.toast('error', 'Não foi possível remover', result.message);
      });
    });
  }

  function resetQueue() {
    ui.confirmDialog({
      title: 'Limpar a lista e iniciar nova fila?',
      description:
        'Todos os ' + current.stats.total + ' clientes de hoje (aguardando e atendidos) serão apagados e a numeração recomeça do 1. Esta ação não pode ser desfeita.',
      confirmLabel: 'Limpar e iniciar',
    }).then(function (confirmed) {
      if (!confirmed) return;
      repo.resetQueue().then(function (result) {
        if (result.ok) {
          setFilter('all');
          ui.toast('success', 'Nova fila iniciada', 'A lista foi limpa e está pronta para novos clientes.');
        } else ui.toast('error', 'Não foi possível limpar a fila', result.message);
      });
    });
  }

  // Um único ouvinte para todos os cards (checkbox e remover).
  els.list.addEventListener('click', function (e) {
    var button = e.target.closest('[data-action]');
    if (!button) return;
    var client = findClient(button.closest('.client').dataset.id);
    if (!client) return;
    if (button.dataset.action === 'toggle') toggleServed(client);
    if (button.dataset.action === 'remove') removeClient(client);
  });

  els.resetBtn.addEventListener('click', resetQueue);

  ui.bindJoinForm(els.form, {
    onSubmit: function (name) {
      return repo.addClient(name, 'admin');
    },
    onSuccess: function (client) {
      ui.toast('success', 'Cliente adicionado', client.name + ' entrou na lista.');
    },
  });

  /* ---------- Filtros ---------- */

  function setFilter(value) {
    filter = value;
    els.tabs.querySelectorAll('[role="tab"]').forEach(function (tab) {
      tab.setAttribute('aria-selected', String(tab.dataset.filter === value));
    });
    render();
  }

  els.tabs.addEventListener('click', function (e) {
    var tab = e.target.closest('[role="tab"]');
    if (tab) setFilter(tab.dataset.filter);
  });

  var EMPTY_TEXTS = {
    all: ['Nenhum cliente na fila', 'Os clientes aparecem aqui assim que se inscreverem. Você também pode adicioná-los manualmente.'],
    waiting: ['Ninguém aguardando', 'Altere o filtro para ver os demais clientes do dia.'],
    served: ['Nenhum atendimento concluído', 'Altere o filtro para ver os demais clientes do dia.'],
  };

  /* ---------- Renderização ---------- */

  function render() {
    var state = current.state;
    var stats = current.stats;
    if (!state) return;

    var isFull = stats.available === 0;
    var pct = stats.total ? Math.round((stats.served / stats.total) * 100) : 0;

    ui.renderDate(document, state.date);
    ui.renderStats(els.summary, stats);
    ui.renderProgress(els.dayProgress, {
      value: stats.served,
      max: stats.total || 1,
      label: 'Progresso do dia',
      trailing: stats.served + '/' + stats.total + ' · ' + pct + '%',
      tone: 'success',
    });
    ui.renderProgress(els.capacity, {
      value: stats.total,
      max: stats.capacity,
      label: stats.total + ' de ' + stats.capacity + ' vagas preenchidas',
      trailing: isFull ? 'Lotado' : undefined,
      size: 'sm',
    });

    els.resetBtn.disabled = stats.total === 0;
    els.form.hidden = isFull;
    els.fullNotice.hidden = !isFull;

    els.tabs.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = String(stats[el.dataset.count]);
    });

    var visible =
      filter === 'all'
        ? state.clients
        : state.clients.filter(function (c) {
            return c.status === filter;
          });

    els.emptyTitle.textContent = EMPTY_TEXTS[filter][0];
    els.emptyDesc.textContent = EMPTY_TEXTS[filter][1];

    ui.renderClientList(els.list, visible, {
      mode: 'admin',
      nextId: rules.firstWaitingId(state),
      allClients: state.clients,
      emptyEl: els.empty,
    });
  }

  ui.connectQueue(function (state, settings, stats) {
    current.state = state;
    current.stats = stats;
    render();
  });
})();
