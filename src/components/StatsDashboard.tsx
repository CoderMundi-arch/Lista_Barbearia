import { CheckCircle2, Clock3, Ticket, Users, type LucideIcon } from 'lucide-react';
import type { QueueStats } from '../types/queue';

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  emphasis?: boolean;
}

function StatTile({ icon: Icon, label, value, hint, emphasis }: StatTileProps) {
  return (
    <div className={`card flex flex-col gap-3 p-4 sm:p-5 ${emphasis ? 'ring-1 ring-white/10' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-silver-400 uppercase">{label}</span>
        <Icon className="size-4 text-silver-500" aria-hidden />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span key={value} className="animate-scale-in font-display text-3xl font-bold tabular-nums text-white">
          {value}
        </span>
        {hint && <span className="text-xs text-silver-500">{hint}</span>}
      </div>
    </div>
  );
}

export function StatsDashboard({ stats, compact = false }: { stats: QueueStats; compact?: boolean }) {
  return (
    <section aria-label="Indicadores da fila" className={`grid grid-cols-2 gap-3 ${compact ? 'lg:grid-cols-4' : 'sm:grid-cols-4'}`}>
      <StatTile icon={Users} label="Inscritos" value={stats.total} hint={`/ ${stats.capacity}`} />
      <StatTile icon={Clock3} label="Aguardando" value={stats.waiting} emphasis />
      <StatTile icon={CheckCircle2} label="Atendidos" value={stats.served} />
      <StatTile icon={Ticket} label="Vagas" value={stats.available} hint="livres" />
    </section>
  );
}
