import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex animate-fade-up flex-col items-center px-6 py-12 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-white/5 blur-xl" aria-hidden />
        <div className="relative grid size-14 place-items-center rounded-2xl border border-white/10 bg-graphite-800">
          <Icon className="size-6 text-silver-300" aria-hidden />
        </div>
      </div>
      <p className="font-display text-base font-semibold text-white">{title}</p>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-silver-400">{description}</p>
    </div>
  );
}
