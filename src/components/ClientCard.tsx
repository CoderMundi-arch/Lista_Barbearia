import { memo } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { formatTime } from '../lib/date';
import type { Client } from '../types/queue';

interface ClientCardProps {
  client: Client;
  mode: 'public' | 'admin';
  isNext?: boolean;
  isMine?: boolean;
  onToggle?: (client: Client) => void;
  onRemove?: (client: Client) => void;
}

function StatusBadge({ served }: { served: boolean }) {
  return served ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-emerald-300/80">
      <Check className="size-3" aria-hidden />
      Atendido
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-silver-200">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-300/60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-amber-300" />
      </span>
      Aguardando
    </span>
  );
}

export const ClientCard = memo(function ClientCard({ client, mode, isNext, isMine, onToggle, onRemove }: ClientCardProps) {
  const served = client.status === 'served';
  const isAdmin = mode === 'admin';

  return (
    <li
      className={`group relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-300 sm:px-4 ${
        served
          ? 'border-white/[0.04] bg-graphite-950/40'
          : isNext
            ? 'border-white/15 bg-graphite-800/90 shadow-[0_0_0_1px_rgb(255_255_255/0.04)]'
            : 'border-white/[0.07] bg-graphite-900/70'
      } ${isMine && !served ? 'ring-1 ring-silver-300/40' : ''}`}
    >
      {isAdmin ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={served}
          aria-label={served ? `Desmarcar atendimento de ${client.name}` : `Marcar ${client.name} como atendido`}
          onClick={() => onToggle?.(client)}
          className={`grid size-12 shrink-0 place-items-center rounded-xl border-2 transition-all duration-200 active:scale-90 ${
            served
              ? 'border-emerald-400 bg-emerald-400 text-ink'
              : 'border-silver-500/60 bg-transparent text-transparent hover:border-silver-200 hover:bg-white/[0.04]'
          }`}
        >
          <Check key={String(served)} className={`size-6 ${served ? 'animate-check-pop' : ''}`} strokeWidth={3} aria-hidden />
        </button>
      ) : null}

      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg font-display text-sm font-bold tabular-nums transition-colors duration-300 ${
          served ? 'bg-white/[0.03] text-silver-500/60' : 'bg-white/[0.07] text-white'
        }`}
        aria-label={`Número ${client.number}`}
      >
        {client.number}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] transition-colors duration-300 ${served ? 'text-silver-500/70' : 'font-medium text-white'}`}>
          <span className="strike" data-active={served}>
            {client.name}
          </span>
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          {isNext && !served && <span className="font-semibold tracking-wide text-silver-200 uppercase">Próximo</span>}
          {isMine && <span className="font-semibold tracking-wide text-silver-200 uppercase">Você</span>}
          {isAdmin && (
            <span className="text-silver-500">
              {served ? `Atendido às ${formatTime(client.servedAt)}` : `Entrou às ${formatTime(client.createdAt)}`}
              {client.source === 'admin' && ' · manual'}
            </span>
          )}
        </div>
      </div>

      {isAdmin ? (
        <button
          type="button"
          onClick={() => onRemove?.(client)}
          aria-label={`Remover ${client.name} da fila`}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-silver-500 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : (
        <StatusBadge served={served} />
      )}
    </li>
  );
});
