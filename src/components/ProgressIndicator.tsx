interface ProgressIndicatorProps {
  value: number;
  max: number;
  label: string;
  /** Texto do lado direito (ex.: "60%"). */
  trailing?: string;
  tone?: 'silver' | 'success';
  size?: 'sm' | 'md';
}

export function ProgressIndicator({ value, max, label, trailing, tone = 'silver', size = 'md' }: ProgressIndicatorProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar =
    tone === 'success'
      ? 'bg-gradient-to-r from-emerald-500/80 to-emerald-300'
      : pct >= 100
        ? 'bg-gradient-to-r from-rose-500/80 to-rose-300'
        : 'bg-gradient-to-r from-silver-500 to-white';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-silver-300">{label}</span>
        <span className="font-medium tabular-nums text-white">{trailing ?? `${pct}%`}</span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-white/[0.06] ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
