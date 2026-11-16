import { CalendarDays, ArrowLeft, Scissors } from 'lucide-react';
import logoStudio from '../assets/logo-studio.jpg';
import logoMark from '../assets/logo-mark-white.png';
import { APP_CONFIG } from '../config/app';
import { formatLongDate } from '../lib/date';
import { navigate } from '../hooks/useRoute';

interface HeaderProps {
  variant: 'public' | 'admin';
  date: string;
}

export function Header({ variant, date }: HeaderProps) {
  if (variant === 'admin') {
    return (
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-graphite-900">
            <img src={logoMark} alt="" className="h-5 w-auto" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold tracking-tight text-white sm:text-base">
              {APP_CONFIG.businessName}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-silver-400">
              <Scissors className="size-3" aria-hidden /> Painel do barbeiro
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('public')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-silver-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Ver página do cliente</span>
            <span className="sm:hidden">Cliente</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="animate-fade-up px-4 pt-8 pb-2 text-center sm:pt-12">
      <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.9)] ring-1 ring-black/40 sm:max-w-[320px]">
        <img
          src={logoStudio}
          alt={`Logo do ${APP_CONFIG.businessName}`}
          width={598}
          height={486}
          className="block h-auto w-full"
        />
      </div>
      <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        {APP_CONFIG.businessName}
      </h1>
      <p className="mt-1 text-sm text-silver-400 sm:text-base">{APP_CONFIG.tagline}</p>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-graphite-900/70 px-3.5 py-1.5 text-xs text-silver-300 sm:text-sm">
        <CalendarDays className="size-3.5 text-silver-400" aria-hidden />
        <time dateTime={date}>{formatLongDate(date)}</time>
      </p>
    </header>
  );
}
