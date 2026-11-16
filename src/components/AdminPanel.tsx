import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, CheckCheck, Clock3, Inbox, RotateCcw, Ticket } from 'lucide-react';
import { ClientList } from './ClientList';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './EmptyState';
import { JoinForm } from './JoinForm';
import { ProgressIndicator } from './ProgressIndicator';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../context/ToastContext';
import { formatLongDate } from '../lib/date';
import type { Client } from '../types/queue';

type Filter = 'all' | 'waiting' | 'served';

type PendingAction = { type: 'remove'; client: Client } | { type: 'reset' } | null;

export function AdminPanel() {
  const { state, stats, setServed, removeClient, resetQueue, addClient } = useQueue();
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [pending, setPending] = useState<PendingAction>(null);

  const nextClientId = useMemo(() => state.clients.find((c) => c.status === 'waiting')?.id ?? null, [state.clients]);
  const visible = useMemo(
    () => (filter === 'all' ? state.clients : state.clients.filter((c) => c.status === filter)),
    [state.clients, filter],
  );

  const handleToggle = useCallback(
    async (client: Client) => {
      const served = client.status !== 'served';
      const result = await setServed(client.id, served);
      if (!result.ok) return notify('error', 'Não foi possível atualizar', result.message);
      notify(
        served ? 'success' : 'info',
        served ? `${client.name} atendido` : 'Atendimento desmarcado',
        served ? undefined : `${client.name} voltou para "Aguardando".`,
      );
    },
    [setServed, notify],
  );

  const handleRemoveRequest = useCallback((client: Client) => setPending({ type: 'remove', client }), []);
  const closeModal = useCallback(() => setPending(null), []);

  async function confirmPending() {
    if (!pending) return;
    if (pending.type === 'remove') {
      const result = await removeClient(pending.client.id);
      if (result.ok) notify('success', 'Cliente removido', `${pending.client.name} saiu da fila. Uma vaga foi liberada.`);
      else notify('error', 'Não foi possível remover', result.message);
    } else {
      const result = await resetQueue();
      if (result.ok) {
        setFilter('all');
        notify('success', 'Nova fila iniciada', 'A lista foi limpa e está pronta para novos clientes.');
      } else notify('error', 'Não foi possível limpar a fila', result.message);
    }
    setPending(null);
  }

  const servedPct = stats.total ? Math.round((stats.served / stats.total) * 100) : 0;
  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: stats.total },
    { id: 'waiting', label: 'Aguardando', count: stats.waiting },
    { id: 'served', label: 'Atendidos', count: stats.served },
  ];

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Resumo do dia */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:order-2" aria-label="Resumo do dia">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-silver-500 uppercase">Fila em andamento</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-silver-200">
                  <CalendarDays className="size-3.5 text-silver-400" aria-hidden />
                  <time dateTime={state.date}>{formatLongDate(state.date)}</time>
                </p>
              </div>
            </div>

            <div className="mt-5">
              <ProgressIndicator
                value={stats.served}
                max={stats.total || 1}
                label="Progresso do dia"
                trailing={`${stats.served}/${stats.total} · ${servedPct}%`}
                tone="success"
              />
            </div>

            <dl className="mt-5 grid grid-cols-3 divide-x divide-white/[0.06] rounded-xl border border-white/[0.06] bg-graphite-950/50">
              {[
                { icon: Clock3, label: 'Aguardando', value: stats.waiting },
                { icon: CheckCheck, label: 'Atendidos', value: stats.served },
                { icon: Ticket, label: 'Vagas', value: stats.available },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="px-2 py-3 text-center">
                  <dt className="flex items-center justify-center gap-1 text-[10px] font-medium tracking-wide text-silver-500 uppercase">
                    <Icon className="size-3" aria-hidden />
                    {label}
                  </dt>
                  <dd key={value} className="mt-1 animate-scale-in font-display text-2xl font-bold tabular-nums text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              <ProgressIndicator
                value={stats.total}
                max={stats.capacity}
                label={`${stats.total} de ${stats.capacity} vagas preenchidas`}
                trailing={stats.available === 0 ? 'Lotado' : undefined}
                size="sm"
              />
            </div>

            <button
              type="button"
              onClick={() => setPending({ type: 'reset' })}
              disabled={stats.total === 0}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden />
              Limpar lista e iniciar nova fila
            </button>
          </div>
        </aside>

        {/* Lista */}
        <section className="card p-4 sm:p-5 lg:order-1" aria-labelledby="admin-list-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="admin-list-title" className="text-lg font-bold text-white">
              Atendimentos
            </h2>
            <div role="tablist" aria-label="Filtrar clientes" className="flex rounded-xl bg-graphite-950/70 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    filter === tab.id ? 'bg-white/10 text-white shadow-sm' : 'text-silver-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 tabular-nums text-silver-500">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <JoinForm
              variant="admin"
              isFull={stats.available === 0}
              onSubmit={(name) => addClient(name, 'admin')}
              onSuccess={(client) => notify('success', 'Cliente adicionado', `${client.name} recebeu o número ${client.number}.`)}
            />
          </div>

          <p className="mb-3 px-1 text-xs text-silver-500">Toque no quadrado para marcar o cliente como atendido.</p>

          <ClientList
            clients={visible}
            mode="admin"
            nextClientId={nextClientId}
            onToggle={handleToggle}
            onRemove={handleRemoveRequest}
            empty={
              <EmptyState
                icon={Inbox}
                title={
                  filter === 'served'
                    ? 'Nenhum atendimento concluído'
                    : filter === 'waiting'
                      ? 'Ninguém aguardando'
                      : 'Nenhum cliente na fila'
                }
                description={
                  filter === 'all'
                    ? 'Os clientes aparecem aqui assim que se inscreverem. Você também pode adicioná-los manualmente.'
                    : 'Altere o filtro para ver os demais clientes do dia.'
                }
              />
            }
          />
        </section>
      </div>

      <ConfirmModal
        open={pending?.type === 'remove'}
        title="Remover cliente da fila?"
        description={
          pending?.type === 'remove'
            ? `${pending.client.name} (nº ${pending.client.number}) será removido da lista de hoje e uma vaga será liberada. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Remover cliente"
        onConfirm={confirmPending}
        onCancel={closeModal}
      />
      <ConfirmModal
        open={pending?.type === 'reset'}
        title="Limpar a lista e iniciar nova fila?"
        description={`Todos os ${stats.total} clientes de hoje (aguardando e atendidos) serão apagados e a numeração recomeça do 1. Esta ação não pode ser desfeita.`}
        confirmLabel="Limpar e iniciar"
        onConfirm={confirmPending}
        onCancel={closeModal}
      />
    </>
  );
}
