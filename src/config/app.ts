/** Configurações centrais da aplicação. Altere aqui para personalizar. */
export const APP_CONFIG = {
  businessName: 'Studio Anadison O Mágico',
  tagline: 'Organize seu atendimento',
  /** Limite máximo de inscrições por dia. */
  maxClientsPerDay: 30,
  /** Tamanho máximo do nome. */
  maxNameLength: 60,
  /** Intervalo (ms) para verificar a virada do dia com a página aberta. */
  dayCheckIntervalMs: 60_000,
} as const;

export const STORAGE_KEYS = {
  queue: 'studio-anadison:queue:v1',
  settings: 'studio-anadison:settings:v1',
  myTicket: 'studio-anadison:my-ticket:v1',
  corruptedBackup: 'studio-anadison:corrupted-backup',
} as const;
