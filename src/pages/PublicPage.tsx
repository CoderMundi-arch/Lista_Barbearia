import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Armchair } from 'lucide-react';
import { Header } from '../components/Header';
import { StatsDashboard } from '../components/StatsDashboard';
import { JoinForm } from '../components/JoinForm';
import { JoinConfirmation } from '../components/JoinConfirmation';
import { ClientList } from '../components/ClientList';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { EmptyState } from '../components/EmptyState';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../context/ToastContext';
import { useMyTicket } from '../hooks/useMyTicket';
import { waitingPosition } from '../services/queueRules';
import { APP_CONFIG } from '../config/app';
import type { Client } from '../types/queue';

export function PublicPage() {
  const { state, stats, ready, addClient } = useQueue();
  const { notify } = useToast();
  const { myClientId, save, clear } = useMyTicket(state.date);
  const [addingAnother, setAddingAnother] = useState(false);
  const listRef = useRef<HTMLElement>(null);

  const myClient = useMemo(() => state.clients.find((c) => c.id === myClientId) ?? null, [state.clients, myClientId]);
  const nextClientId = useMemo(() => state.clients.find((c) => c.status === 'waiting')?.id ?? null, [state.clients]);
  const isFull = stats.available === 0;

  // Se a inscrição deste aparelho foi removida pelo barbeiro, esquece-a.
  useEffect(() => {
    if (ready && myClientId && !myClient) clear();
  }, [ready, myClientId, myClient, clear]);

  const handleSuccess = useCallback(
    (client: Client) => {
      save(client.id);
      setAddingAnother(false);
      notify('success', 'Inscrição confirmada!', `${client.name} recebeu o número ${client.number}.`);
    },
    [save, notify],
  );

  const scrollToList = () => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const showConfirmation = myClient && !addingAnother;

  return (
    <div className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <Header variant="public" date={state.date} />

      <main className="mx-auto mt-6 max-w-2xl space-y-5 px-4 sm:px-6">
        <section className="card animate-fade-up p-5 [animation-delay:60ms] sm:p-7" aria-labelledby="join-title">
          {showConfirmation ? (
            <JoinConfirmation
              client={myClient}
              position={waitingPosition(state, myClient.id)}
              onViewList={scrollToList}
              onAddAnother={() => setAddingAnother(true)}
            />
          ) : (
            <>
              <div className="mb-5">
                <h2 id="join-title" className="text-xl font-bold text-white sm:text-2xl">
                  Entre na fila
                </h2>
                <p className="mt-1 text-sm text-silver-400">Digite seu nome e garanta seu lugar no atendimento de hoje.</p>
              </div>
              <JoinForm
                variant="public"
                isFull={isFull}
                onSubmit={(name) => addClient(name, 'public')}
                onSuccess={handleSuccess}
              />
              {addingAnother && myClient && (
                <button
                  type="button"
                  onClick={() => setAddingAnother(false)}
                  className="mt-3 w-full rounded-lg py-2 text-sm text-silver-400 transition hover:text-white"
                >
                  Voltar para minha inscrição
                </button>
              )}
            </>
          )}

          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <ProgressIndicator
              value={stats.total}
              max={stats.capacity}
              label={`${stats.total} de ${stats.capacity} vagas preenchidas`}
              trailing={isFull ? 'Lotado' : `${stats.available} ${stats.available === 1 ? 'vaga' : 'vagas'}`}
              size="sm"
            />
          </div>
        </section>

        <div className="animate-fade-up [animation-delay:120ms]">
          <StatsDashboard stats={stats} />
        </div>

        <section
          ref={listRef}
          className="card scroll-mt-4 animate-fade-up p-4 [animation-delay:180ms] sm:p-6"
          aria-labelledby="list-title"
        >
          <div className="mb-4 flex items-end justify-between gap-3 px-1">
            <div>
              <h2 id="list-title" className="text-lg font-bold text-white">
                Lista de atendimento
              </h2>
              <p className="text-xs text-silver-500">Ordem de chegada · atualizada automaticamente</p>
            </div>
            {stats.total > 0 && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium tabular-nums text-silver-300">
                {stats.waiting} aguardando
              </span>
            )}
          </div>
          <ClientList
            clients={state.clients}
            mode="public"
            nextClientId={nextClientId}
            myClientId={myClientId}
            empty={
              <EmptyState
                icon={Armchair}
                title="A fila está livre"
                description="Ninguém se inscreveu ainda hoje. Seja o primeiro a garantir seu lugar!"
              />
            }
          />
        </section>

        <footer className="pt-4 text-center text-xs text-silver-500">
          © {new Date().getFullYear()} {APP_CONFIG.businessName}
        </footer>
      </main>
    </div>
  );
}
