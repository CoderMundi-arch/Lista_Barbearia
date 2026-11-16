import type { ReactNode } from 'react';
import { ClientCard } from './ClientCard';
import type { Client } from '../types/queue';

interface ClientListProps {
  clients: Client[];
  mode: 'public' | 'admin';
  /** ID do primeiro cliente aguardando (destacado como "Próximo"). */
  nextClientId?: string | null;
  myClientId?: string | null;
  onToggle?: (client: Client) => void;
  onRemove?: (client: Client) => void;
  empty: ReactNode;
}

export function ClientList({ clients, mode, nextClientId, myClientId, onToggle, onRemove, empty }: ClientListProps) {
  if (clients.length === 0) return <>{empty}</>;

  return (
    <ol className="space-y-2" aria-label="Lista de atendimento">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          mode={mode}
          isNext={client.id === nextClientId}
          isMine={client.id === myClientId}
          onToggle={onToggle}
          onRemove={onRemove}
        />
      ))}
    </ol>
  );
}
