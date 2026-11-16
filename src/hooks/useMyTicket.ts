import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '../config/app';

interface StoredTicket {
  date: string;
  clientId: string;
}

function read(): StoredTicket | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.myTicket);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTicket>;
    return typeof parsed.date === 'string' && typeof parsed.clientId === 'string'
      ? { date: parsed.date, clientId: parsed.clientId }
      : null;
  } catch {
    return null;
  }
}

/** Lembra, neste aparelho, qual inscrição foi feita por ele (para destacar "Você" na lista). */
export function useMyTicket(queueDate: string) {
  const [ticket, setTicket] = useState<StoredTicket | null>(read);

  const save = useCallback(
    (clientId: string) => {
      const value = { date: queueDate, clientId };
      try {
        window.localStorage.setItem(STORAGE_KEYS.myTicket, JSON.stringify(value));
      } catch {
        /* ignora: é apenas uma conveniência */
      }
      setTicket(value);
    },
    [queueDate],
  );

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.myTicket);
    } catch {
      /* ignora */
    }
    setTicket(null);
  }, []);

  return { myClientId: ticket && ticket.date === queueDate ? ticket.clientId : null, save, clear };
}
