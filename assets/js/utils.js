/* Funções utilitárias: datas em pt-BR, nomes, ids e segurança de HTML. */
(function () {
  'use strict';

  var config = window.Fila.config;

  /* ---------- Datas ---------- */

  /** Data local no formato YYYY-MM-DD (fuso do dispositivo). */
  function todayKey(now) {
    var d = now || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function keyToDate(key) {
    var p = key.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  var longFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

  /** Ex.: "Segunda-feira, 16 de novembro de 2026" */
  function formatLongDate(key) {
    var text = longFormatter.format(keyToDate(key));
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** Ex.: "14:35" */
  function formatTime(iso) {
    if (!iso) return '';
    var date = new Date(iso);
    return isNaN(date.getTime()) ? '' : timeFormatter.format(date);
  }

  /* ---------- Nomes ---------- */

  var LOWER_WORDS = ['da', 'de', 'do', 'das', 'dos', 'e'];

  /** "  joão   da silva " → "João da Silva" */
  function formatName(raw) {
    return raw
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(function (word, index) {
        var lower = word.toLocaleLowerCase('pt-BR');
        if (index > 0 && LOWER_WORDS.indexOf(lower) !== -1) return lower;
        return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
      })
      .join(' ');
  }

  /** Chave de comparação: sem acentos, minúsculas e espaços normalizados. */
  function normalizeNameKey(raw) {
    return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  var VALID_NAME = /^[\p{L}][\p{L}' .-]*$/u;
  var NON_LETTERS = /[^\p{L}]/gu;

  /**
   * Valida o nome digitado.
   * @param {string} raw
   * @param {{requireFullName: boolean}} options
   * @returns {{ok: true, name: string} | {ok: false, error: string, message: string}}
   */
  function validateName(raw, options) {
    var name = String(raw || '').trim().replace(/\s+/g, ' ');

    if (!name) {
      return { ok: false, error: 'EMPTY_NAME', message: 'Digite seu nome completo para entrar na fila.' };
    }
    if (name.length > config.maxNameLength) {
      return { ok: false, error: 'NAME_TOO_LONG', message: 'O nome pode ter no máximo ' + config.maxNameLength + ' caracteres.' };
    }
    if (!VALID_NAME.test(name) || name.replace(NON_LETTERS, '').length < 2) {
      return { ok: false, error: 'INVALID_NAME', message: 'Use apenas letras no nome, sem números ou símbolos.' };
    }
    if (options && options.requireFullName) {
      var parts = name.split(' ').filter(function (p) {
        return p.replace(NON_LETTERS, '').length >= 2;
      });
      if (parts.length < 2) {
        return { ok: false, error: 'INCOMPLETE_NAME', message: 'Informe nome e sobrenome para facilitar a chamada.' };
      }
    }
    return { ok: true, name: formatName(name) };
  }

  /* ---------- Diversos ---------- */

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  var HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Escapa texto antes de inseri-lo em HTML (evita injeção de código pelo nome). */
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return HTML_ESCAPES[ch];
    });
  }

  function plural(count, singular, pluralForm) {
    return count === 1 ? singular : pluralForm;
  }

  window.Fila.utils = {
    todayKey: todayKey,
    formatLongDate: formatLongDate,
    formatTime: formatTime,
    formatName: formatName,
    normalizeNameKey: normalizeNameKey,
    validateName: validateName,
    createId: createId,
    escapeHtml: escapeHtml,
    plural: plural,
  };
})();
