import { CheckCircle2, ListOrdered, Sparkles, UserPlus } from 'lucide-react';
import type { Client } from '../types/queue';

interface JoinConfirmationProps {
  client: Client;
  /** Posição atual entre os que aguardam (1 = próximo). Null se já atendido. */
  position: number | null;
  onViewList: () => void;
  onAddAnother: () => void;
}

export function JoinConfirmation({ client, position, onViewList, onAddAnother }: JoinConfirmationProps) {
  const served = client.status === 'served';
  const ahead = position !== null ? position - 1 : 0;
  const firstName = client.name.split(' ')[0];

  return (
    <div className="animate-scale-in text-center" role="status" aria-live="polite">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-400/10 ring-8 ring-emerald-400/[0.04]">
        {served ? (
          <Sparkles className="size-7 text-emerald-300" aria-hidden />
        ) : (
          <CheckCircle2 className="size-7 text-emerald-300" aria-hidden />
        )}
      </div>

      <h2 className="text-xl font-bold text-white">
        {served ? `Obrigado, ${firstName}!` : `Pronto, ${firstName}! Você está na fila.`}
      </h2>
      <p className="mt-1 text-sm text-silver-400">
        {served ? 'Seu atendimento foi concluído. Volte sempre!' : 'Guarde seu número e acompanhe a lista abaixo.'}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-graphite-950/70 p-4">
          <p className="text-[11px] font-medium tracking-wide text-silver-500 uppercase">Seu número</p>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-white">{client.number}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-graphite-950/70 p-4">
          <p className="text-[11px] font-medium tracking-wide text-silver-500 uppercase">Posição na fila</p>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-white">
            {served ? '—' : `${position}º`}
          </p>
        </div>
      </div>

      {!served && (
        <p className="mt-4 text-sm text-silver-300">
          {ahead === 0 ? (
            <strong className="font-semibold text-white">Você é o próximo a ser atendido!</strong>
          ) : (
            <>
              Há{' '}
              <strong className="font-semibold text-white">
                {ahead} {ahead === 1 ? 'pessoa' : 'pessoas'}
              </strong>{' '}
              na sua frente.
            </>
          )}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onViewList}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-ink transition hover:bg-silver-100 active:scale-[0.98]"
        >
          <ListOrdered className="size-4" aria-hidden />
          Ver lista
        </button>
        <button
          type="button"
          onClick={onAddAnother}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium text-silver-200 transition hover:bg-white/5 active:scale-[0.98]"
        >
          <UserPlus className="size-4" aria-hidden />
          Inscrever outra pessoa
        </button>
      </div>
    </div>
  );
}
