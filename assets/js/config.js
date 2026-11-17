/* Configurações centrais. Altere aqui para personalizar a aplicação. */
(function () {
  'use strict';

  window.Fila = window.Fila || {};

  window.Fila.config = Object.freeze({
    businessName: 'Studio Anadison O Mágico',
    tagline: 'Organize seu atendimento',
    /** Limite máximo de inscrições por dia. */
    maxClientsPerDay: 30,
    /** Tamanho máximo do nome. */
    maxNameLength: 60,
    /** Intervalo (ms) para verificar a virada do dia com a página aberta. */
    dayCheckIntervalMs: 60000,
    storageKeys: Object.freeze({
      queue: 'studio-anadison:queue:v1',
      settings: 'studio-anadison:settings:v1',
      corruptedBackup: 'studio-anadison:corrupted-backup',
    }),
  });
})();
