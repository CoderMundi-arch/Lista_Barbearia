import { APP_CONFIG } from '../config/app';
import type { QueueErrorCode } from '../types/queue';

/** Remove espaços extras e capitaliza cada parte do nome ("joão  da silva" → "João da Silva"). */
export function formatName(raw: string): string {
  const lowerWords = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('pt-BR');
      if (index > 0 && lowerWords.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join(' ');
}

/** Chave de comparação: sem acentos, minúsculas e espaços normalizados. */
export function normalizeNameKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const VALID_NAME = /^[\p{L}][\p{L}' .-]*$/u;

export interface NameValidationOptions {
  /** Exige nome e sobrenome (área pública). */
  requireFullName: boolean;
}

export function validateName(
  raw: string,
  { requireFullName }: NameValidationOptions,
): { ok: true; name: string } | { ok: false; error: QueueErrorCode; message: string } {
  const name = raw.trim().replace(/\s+/g, ' ');

  if (!name) {
    return { ok: false, error: 'EMPTY_NAME', message: 'Digite seu nome completo para entrar na fila.' };
  }
  if (name.length > APP_CONFIG.maxNameLength) {
    return {
      ok: false,
      error: 'NAME_TOO_LONG',
      message: `O nome pode ter no máximo ${APP_CONFIG.maxNameLength} caracteres.`,
    };
  }
  if (!VALID_NAME.test(name) || name.replace(/[^\p{L}]/gu, '').length < 2) {
    return { ok: false, error: 'INVALID_NAME', message: 'Use apenas letras no nome, sem números ou símbolos.' };
  }
  if (requireFullName && name.split(' ').filter((p) => p.replace(/[^\p{L}]/gu, '').length >= 2).length < 2) {
    return {
      ok: false,
      error: 'INCOMPLETE_NAME',
      message: 'Informe nome e sobrenome para facilitar a chamada.',
    };
  }
  return { ok: true, name: formatName(name) };
}
