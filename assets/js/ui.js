/*
 * Componentes de interface reutilizáveis:
 * notificações (toast), modal de confirmação, indicador de progresso,
 * painel de indicadores, lista/card de atendimento, formulário de inscrição
 * e a conexão da página com o repositório.
 */
(function () {
  'use strict';

  var Fila = window.Fila;
  var icon = Fila.icons.icon;
  var esc = Fila.utils.escapeHtml;
  var utils = Fila.utils;
  var config = Fila.config;

  /* =====================================================================
   * Toast — notificações discretas
   * ===================================================================== */

  var TOAST_ICONS = { success: 'circle-check-big', error: 'circle-x', info: 'info', warning: 'triangle-alert' };
  var toastRegion = null;

  function ensureToastRegion() {
    if (toastRegion) return toastRegion;
    toastRegion = document.createElement('div');
    toastRegion.className = 'toasts';
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRegion);
    return toastRegion;
  }

  function toast(variant, title, description) {
    var region = ensureToastRegion();
    while (region.children.length >= 1) region.removeChild(region.firstChild);

    var el = document.createElement('div');
    el.className = 'toast toast--' + variant;
    el.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    el.innerHTML =
      icon(TOAST_ICONS[variant], 'toast__icon') +
      '<div class="toast__body"><p class="toast__title">' + esc(title) + '</p>' +
      (description ? '<p class="toast__desc">' + esc(description) + '</p>' : '') +
      '</div><button type="button" class="toast__close" aria-label="Fechar notificação">' + icon('x') + '</button>';

    function close() {
      if (!el.isConnected) return;
      el.classList.add('is-leaving');
      setTimeout(function () {
        el.remove();
      }, 200);
    }
    el.querySelector('.toast__close').addEventListener('click', close);
    region.appendChild(el);
    setTimeout(close, variant === 'error' ? 5500 : 3500);
  }

  /* =====================================================================
   * Modais (base comum + confirmação + cadastro de nome)
   * ===================================================================== */

  /**
   * Abre um modal acessível: foco preso dentro dele, Esc e toque no fundo fecham.
   * @param {string} contentHtml  Conteúdo do diálogo
   * @param {{role?: string, labelledBy: string, describedBy?: string, placement?: 'top'|'center'}} options
   * @returns {{root: HTMLElement, dialog: HTMLElement, close: () => void, onClose: (fn: () => void) => void}}
   */
  function openModal(contentHtml, options) {
    var previous = document.activeElement;
    var root = document.createElement('div');
    root.className = 'modal' + (options.placement === 'top' ? ' modal--top' : '');
    root.innerHTML =
      '<div class="modal__backdrop" data-close></div>' +
      '<div class="modal__dialog" role="' + (options.role || 'dialog') + '" aria-modal="true" aria-labelledby="' +
      options.labelledBy + '"' + (options.describedBy ? ' aria-describedby="' + options.describedBy + '"' : '') + '>' +
      contentHtml +
      '</div>';

    var dialog = root.querySelector('.modal__dialog');
    var closeHandlers = [];
    var closed = false;

    function focusables() {
      return Array.prototype.filter.call(dialog.querySelectorAll('button, input'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      var items = focusables();
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      root.classList.add('is-leaving');
      setTimeout(function () {
        root.remove();
      }, 150);
      if (previous && previous.focus) previous.focus({ preventScroll: true });
      closeHandlers.forEach(function (fn) {
        fn();
      });
    }

    root.querySelector('[data-close]').addEventListener('click', close);
    root.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', close);
    });
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    document.body.appendChild(root);

    return {
      root: root,
      dialog: dialog,
      close: close,
      onClose: function (fn) {
        closeHandlers.push(fn);
      },
    };
  }

  /** Modal de confirmação — retorna Promise<boolean>. */
  function confirmDialog(options) {
    return new Promise(function (resolve) {
      var confirmed = false;
      var modal = openModal(
        '<div class="modal__icon">' + icon('triangle-alert') + '</div>' +
          '<h2 id="modal-title" class="modal__title">' + esc(options.title) + '</h2>' +
          '<p id="modal-desc" class="modal__desc">' + esc(options.description) + '</p>' +
          '<div class="modal__actions">' +
          '<button type="button" class="btn btn--ghost" data-cancel>' + esc(options.cancelLabel || 'Cancelar') + '</button>' +
          '<button type="button" class="btn btn--danger" data-confirm>' + esc(options.confirmLabel) + '</button>' +
          '</div>',
        { role: 'alertdialog', labelledBy: 'modal-title', describedBy: 'modal-desc' },
      );
      modal.dialog.querySelector('[data-confirm]').addEventListener('click', function () {
        confirmed = true;
        modal.close();
      });
      modal.onClose(function () {
        resolve(confirmed);
      });
      modal.dialog.querySelector('[data-cancel]').focus();
    });
  }

  /**
   * Janela para cadastrar um nome. Mostra erros de validação sem fechar.
   * @param {{onSubmit: (name: string) => Promise<any>}} options
   * @returns {Promise<object|null>} cliente cadastrado ou null se cancelado
   */
  function nameDialog(options) {
    return new Promise(function (resolve) {
      var created = null;
      var modal = openModal(
        '<button type="button" class="modal__close" data-cancel aria-label="Fechar">' + icon('x') + '</button>' +
          '<h2 id="name-title" class="modal__title">Cadastrar nome</h2>' +
          '<p id="name-desc" class="modal__desc">Digite o nome e o sobrenome do cliente.</p>' +
          '<form class="modal__form" novalidate>' +
          '<label for="name-input" class="sr-only">Nome completo</label>' +
          '<input id="name-input" name="name" type="text" class="input input--lg" autocomplete="name" ' +
          'autocapitalize="words" enterkeyhint="done" placeholder="Ex.: João da Silva" />' +
          '<p id="name-error" class="field-error" role="alert" hidden></p>' +
          '<div class="modal__actions">' +
          '<button type="button" class="btn btn--ghost" data-cancel>Cancelar</button>' +
          '<button type="submit" class="btn btn--primary">' + icon('check') + 'Cadastrar</button>' +
          '</div></form>',
        { labelledBy: 'name-title', describedBy: 'name-desc', placement: 'top' },
      );

      var form = bindJoinForm(modal.dialog.querySelector('form'), {
        onSubmit: options.onSubmit,
        onSuccess: function (client) {
          created = client;
          modal.close();
        },
      });
      modal.onClose(function () {
        resolve(created);
      });
      form.focus();
    });
  }

  /* =====================================================================
   * Indicador de progresso
   * ===================================================================== */

  /**
   * @param {HTMLElement} el  Elemento com a classe "progress" (preenchido aqui)
   * @param {{value:number, max:number, label:string, trailing?:string, tone?:'silver'|'success', size?:'sm'|'md'}} o
   */
  function renderProgress(el, o) {
    var pct = o.max > 0 ? Math.min(100, Math.round((o.value / o.max) * 100)) : 0;
    if (!el.firstChild) {
      el.innerHTML =
        '<div class="progress__head"><span class="progress__label"></span><span class="progress__value"></span></div>' +
        '<div class="progress__track" role="progressbar" aria-valuemin="0"><div class="progress__bar"></div></div>';
    }
    el.classList.toggle('progress--sm', o.size === 'sm');
    el.dataset.tone = o.tone === 'success' ? 'success' : pct >= 100 ? 'full' : 'silver';
    el.querySelector('.progress__label').textContent = o.label;
    el.querySelector('.progress__value').textContent = o.trailing != null ? o.trailing : pct + '%';
    var track = el.querySelector('.progress__track');
    track.setAttribute('aria-valuemax', String(o.max));
    track.setAttribute('aria-valuenow', String(o.value));
    track.setAttribute('aria-label', o.label);
    el.querySelector('.progress__bar').style.width = pct + '%';
  }

  /* =====================================================================
   * Valores numéricos com animação ao mudar
   * ===================================================================== */

  function setNumber(el, value) {
    var text = String(value);
    if (el.textContent === text) return;
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth; // reinicia a animação
    el.classList.add('pop');
  }

  /** Preenche todos os [data-stat="..."] dentro de root com os valores de stats. */
  function renderStats(root, stats) {
    root.querySelectorAll('[data-stat]').forEach(function (el) {
      setNumber(el, stats[el.getAttribute('data-stat')]);
    });
    root.querySelectorAll('[data-stat-capacity]').forEach(function (el) {
      el.textContent = '/ ' + stats.capacity;
    });
  }

  /* =====================================================================
   * Card e lista de atendimento
   * ===================================================================== */

  function createCard(mode) {
    var li = document.createElement('li');
    li.className = 'client';
    if (mode === 'admin') {
      li.innerHTML =
        '<button type="button" class="check" role="checkbox" data-action="toggle">' + icon('check', 'check__icon', 3) + '</button>' +
        '<span class="client__num"></span>' +
        '<div class="client__body"><p class="client__name"><span class="strike"></span></p><div class="client__meta"></div></div>' +
        '<button type="button" class="icon-btn icon-btn--danger" data-action="remove">' + icon('trash-2') + '</button>';
    } else {
      // Visão do cliente: somente leitura, sem checkbox nem lixeira.
      li.innerHTML =
        '<span class="client__num"></span>' +
        '<div class="client__body"><p class="client__name"><span class="strike"></span></p><div class="client__meta"></div></div>' +
        '<span class="client__done" aria-hidden="true">' + icon('check', '', 3) + '</span>';
    }
    return li;
  }

  function updateCard(li, client, mode, flags) {
    var served = client.status === 'served';
    var wasServed = li.dataset.status === 'served';
    li.dataset.id = client.id;
    li.dataset.status = client.status;
    li.classList.toggle('is-next', mode === 'admin' && !!flags.isNext && !served);

    li.querySelector('.client__num').textContent = String(flags.position);
    li.querySelector('.client__num').setAttribute('aria-label', 'Posição ' + flags.position);
    var strike = li.querySelector('.strike');
    strike.textContent = client.name;
    strike.dataset.active = String(served);

    var meta = [];
    if (mode === 'admin') {
      if (flags.isNext && !served) meta.push('<span class="tag">Próximo</span>');
      meta.push(
        '<span class="client__time">' +
          (served ? 'Atendido às ' + utils.formatTime(client.servedAt) : 'Entrou às ' + utils.formatTime(client.createdAt)) +
          (client.source === 'admin' ? ' · manual' : '') +
          '</span>',
      );
    }
    li.querySelector('.client__meta').innerHTML = meta.join('');

    var check = li.querySelector('.check');
    if (!check) {
      li.querySelector('.strike').setAttribute('aria-label', client.name + (served ? ', atendido' : ', aguardando'));
      return;
    }
    check.setAttribute('aria-checked', String(served));
    check.setAttribute('aria-label', served ? 'Desmarcar atendimento de ' + client.name : 'Marcar ' + client.name + ' como atendido');
    if (served && !wasServed) {
      check.classList.remove('pop');
      void check.offsetWidth;
      check.classList.add('pop');
    }
    li.querySelector('[data-action="remove"]').setAttribute('aria-label', 'Remover ' + client.name + ' da lista');
  }

  /**
   * Atualiza a lista mantendo os elementos existentes (assim as transições,
   * como o risco do nome, acontecem de forma suave).
   */
  function renderClientList(listEl, clients, options) {
    var existing = {};
    Array.prototype.forEach.call(listEl.children, function (li) {
      existing[li.dataset.id] = li;
    });

    // A numeração exibida é a posição na lista completa do dia (1, 2, 3…), mesmo com filtro.
    var allClients = options.allClients || clients;
    var positions = {};
    allClients.forEach(function (c, i) {
      positions[c.id] = i + 1;
    });

    clients.forEach(function (client, index) {
      var li = existing[client.id];
      if (li) delete existing[client.id];
      else {
        li = createCard(options.mode);
        li.classList.add('is-new');
      }
      updateCard(li, client, options.mode, {
        position: positions[client.id],
        isNext: client.id === options.nextId,
      });
      if (listEl.children[index] !== li) listEl.insertBefore(li, listEl.children[index] || null);
    });

    Object.keys(existing).forEach(function (id) {
      existing[id].remove();
    });

    listEl.hidden = clients.length === 0;
    if (options.emptyEl) options.emptyEl.hidden = clients.length !== 0;
  }

  /* =====================================================================
   * Formulário de inscrição
   * ===================================================================== */

  /**
   * @param {HTMLFormElement} form  Precisa conter: input[name=name], button[type=submit], .field-error
   * @param {{onSubmit:(name:string)=>Promise<any>, onSuccess:(client:any)=>void}} handlers
   */
  function bindJoinForm(form, handlers) {
    var input = form.querySelector('input[name="name"]');
    var button = form.querySelector('button[type="submit"]');
    var errorEl = form.querySelector('.field-error');
    var buttonHtml = button.innerHTML;
    var busy = false;

    input.setAttribute('maxlength', String(config.maxNameLength));

    function setError(message) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (message) input.setAttribute('aria-describedby', errorEl.id);
      else input.removeAttribute('aria-describedby');
    }

    input.addEventListener('input', function () {
      if (!errorEl.hidden) setError('');
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) return;
      busy = true;
      button.disabled = true;
      button.innerHTML = icon('loader-circle', 'spin');

      handlers.onSubmit(input.value).then(function (result) {
        busy = false;
        button.disabled = false;
        button.innerHTML = buttonHtml;
        if (result.ok) {
          input.value = '';
          setError('');
          handlers.onSuccess(result.client);
        } else {
          setError(result.message);
          input.focus();
        }
      });
    });

    return {
      focus: function () {
        input.focus();
      },
      clearError: function () {
        setError('');
      },
    };
  }

  /* =====================================================================
   * Conexão da página com o repositório
   * ===================================================================== */

  /* =====================================================================
   * Avisos fixos (sem conexão / modo demonstração)
   * ===================================================================== */

  function showBanner(id, html, tone) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'banner banner--' + (tone || 'info');
      el.setAttribute('role', 'status');
      document.body.insertBefore(el, document.body.firstChild);
    }
    el.innerHTML = html;
    el.hidden = false;
  }

  function hideBanner(id) {
    var el = document.getElementById(id);
    if (el) el.hidden = true;
  }

  /* =====================================================================
   * Conexão da página com o repositório
   * ===================================================================== */

  /**
   * Carrega a lista, escuta mudanças, busca atualizações periodicamente e trata a virada do dia.
   * @param {(state:any, settings:any, stats:any)=>void} onChange
   * @param {{pollMs?: number, onAuthExpired?: () => void}} [options]
   */
  function connectQueue(onChange, options) {
    options = options || {};
    var repo = Fila.repository;
    var settings = { maxClientsPerDay: config.maxClientsPerDay, allowPublicRegistration: true };

    function handle(state) {
      onChange(state, settings, Fila.rules.computeStats(state, settings));
    }

    if (repo.mode === 'demo') {
      showBanner(
        'demo-banner',
        icon('info') +
          '<span><strong>Modo demonstração:</strong> os nomes ficam só neste navegador. ' +
          'Configure a planilha em <code>assets/js/config.js</code>.</span>',
        'info',
      );
    }

    repo.subscribeNotices(function (notice) {
      if (notice.type === 'recovered-from-corruption') {
        toast('warning', 'Dados da fila recuperados', 'Encontramos informações inválidas salvas e iniciamos uma fila nova.');
      } else if (notice.type === 'new-day') {
        toast('info', 'Novo dia, nova lista', 'A lista de hoje começou vazia.');
      } else if (notice.type === 'offline') {
        showBanner('net-banner', icon('triangle-alert') + '<span>Sem conexão com a lista. Tentando novamente…</span>', 'warning');
      } else if (notice.type === 'online') {
        hideBanner('net-banner');
      } else if (notice.type === 'auth-expired' && options.onAuthExpired) {
        options.onAuthExpired();
      }
    });
    repo.subscribe(handle);

    Promise.all([repo.getState(), repo.getSettings()]).then(function (values) {
      settings = values[1];
      handle(values[0]);
      document.body.classList.add('is-ready');
    });

    // Atualização periódica (pausa quando a aba está em segundo plano).
    var interval = repo.mode === 'remote' ? options.pollMs || config.pollIntervalMs : config.dayCheckIntervalMs;
    function tick() {
      if (document.visibilityState !== 'visible') return;
      repo.ensureCurrentDay().then(function () {
        return repo.getSettings && repo.mode === 'remote' ? repo.getSettings() : null;
      }).then(function (s) {
        if (s && (s.maxClientsPerDay !== settings.maxClientsPerDay || s.allowPublicRegistration !== settings.allowPublicRegistration)) {
          settings = s;
          repo.getState().then(handle);
        }
      });
    }
    setInterval(tick, interval);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
  }

  /** Preenche textos fixos marcados com data-bind (nome da barbearia etc.). */
  function bindStaticTexts() {
    document.querySelectorAll('[data-bind="businessName"]').forEach(function (el) {
      el.textContent = config.businessName;
    });
    document.querySelectorAll('[data-bind="tagline"]').forEach(function (el) {
      el.textContent = config.tagline;
    });
    document.querySelectorAll('[data-bind="year"]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
    document.querySelectorAll('[data-bind="logoAlt"]').forEach(function (el) {
      el.setAttribute('alt', 'Logo do ' + config.businessName);
    });
  }

  function renderDate(root, dateKey) {
    root.querySelectorAll('[data-bind="date"]').forEach(function (el) {
      el.textContent = utils.formatLongDate(dateKey);
      el.setAttribute('datetime', dateKey);
    });
  }

  Fila.ui = {
    toast: toast,
    confirmDialog: confirmDialog,
    nameDialog: nameDialog,
    renderProgress: renderProgress,
    renderStats: renderStats,
    setNumber: setNumber,
    renderClientList: renderClientList,
    bindJoinForm: bindJoinForm,
    connectQueue: connectQueue,
    bindStaticTexts: bindStaticTexts,
    renderDate: renderDate,
  };
})();
