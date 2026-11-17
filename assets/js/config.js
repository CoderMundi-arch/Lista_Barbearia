/* Configurações centrais. Altere aqui para personalizar a aplicação. */
(function () {
  'use strict';

  window.Fila = window.Fila || {};

  window.Fila.config = Object.freeze({
    /**
     * URL do App da Web do Google Apps Script (termina em /exec).
     * Cole aqui o endereço gerado em "Implantar → Nova implantação".
     * Enquanto estiver vazio, o site roda em MODO DEMONSTRAÇÃO
     * (dados apenas neste navegador; senha do painel: demo).
     */
    apiUrl: 'https://script.google.com/macros/s/AKfycbwhsHI-BU4xhYUfvGb527_VzIb5K6EXnS9zZTnX1hQLb7fafFEGFTiHN3VRe-DhA-qH/exec',

    businessName: 'Studio Anadison O Mágico',
    tagline: 'Organize seu atendimento',

    /** Intervalo (ms) para buscar atualizações da lista. */
    pollIntervalMs: 6000,
    /** Intervalo (ms) de atualização no painel do barbeiro. */
    adminPollIntervalMs: 4000,

    /* Usados apenas no modo demonstração (na planilha, quem manda é o script). */
    maxClientsPerDay: 30,
    maxNameLength: 60,
    dayCheckIntervalMs: 60000,
    demoPassword: 'demo',

    storageKeys: Object.freeze({
      queue: 'studio-anadison:queue:v1',
      settings: 'studio-anadison:settings:v1',
      adminAuth: 'studio-anadison:admin-auth:v1',
      corruptedBackup: 'studio-anadison:corrupted-backup',
    }),
  });
})();
