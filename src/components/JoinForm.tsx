import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, Lock, UserPlus } from 'lucide-react';
import { APP_CONFIG } from '../config/app';
import type { Client, QueueResult } from '../types/queue';

interface JoinFormProps {
  variant: 'public' | 'admin';
  isFull: boolean;
  onSubmit: (name: string) => Promise<QueueResult<Client>>;
  onSuccess: (client: Client) => void;
  onError?: (message: string) => void;
}

export function JoinForm({ variant, isFull, onSubmit, onSuccess, onError }: JoinFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const isPublic = variant === 'public';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || isFull) return;
    setSubmitting(true);
    const result = await onSubmit(name);
    setSubmitting(false);
    if (result.ok) {
      setName('');
      setError(null);
      onSuccess(result.data);
    } else {
      setError(result.message);
      onError?.(result.message);
    }
  }

  if (isFull && !isPublic) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-silver-300">
        <Lock className="size-4 shrink-0 text-rose-300" aria-hidden />
        <span>
          <strong className="font-medium text-white">Lotado.</strong> Remova um cliente para liberar vaga.
        </span>
      </p>
    );
  }

  if (isFull) {
    return (
      <div className={`flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-5`}>
        <Lock className="mt-0.5 size-5 shrink-0 text-rose-300" aria-hidden />
        <div>
          <p className="font-medium text-white">Inscrições encerradas por hoje</p>
          <p className="mt-0.5 text-sm text-silver-400">
            Todas as {APP_CONFIG.maxClientsPerDay} vagas foram preenchidas. Volte amanhã ou fale com a barbearia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={isPublic ? 'space-y-4' : 'flex flex-col gap-3 sm:flex-row sm:items-start'}>
      <div className="flex-1">
        <label htmlFor={inputId} className={isPublic ? 'mb-2 block text-sm font-medium text-silver-200' : 'sr-only'}>
          {isPublic ? 'Seu nome completo' : 'Nome do cliente'}
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="text"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="go"
          maxLength={APP_CONFIG.maxNameLength}
          placeholder={isPublic ? 'Ex.: João da Silva' : 'Adicionar cliente manualmente'}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl border bg-graphite-950/80 px-4 text-base text-white placeholder:text-silver-500 transition outline-none focus:bg-graphite-950 focus:ring-4 ${
            error
              ? 'border-rose-400/50 focus:border-rose-400/70 focus:ring-rose-500/10'
              : 'border-white/10 focus:border-silver-300/60 focus:ring-white/[0.06]'
          } ${isPublic ? 'h-14' : 'h-12'}`}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-2 animate-fade-in text-sm text-rose-300">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className={`group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${
          isPublic
            ? 'h-14 w-full bg-white font-display text-base text-ink shadow-[0_10px_30px_-10px_rgb(255_255_255/0.35)] hover:bg-silver-100'
            : 'h-12 border border-white/10 bg-white/[0.06] px-5 text-sm text-white hover:bg-white/10'
        }`}
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : isPublic ? (
          <>
            Entrar na fila
            <ArrowRight className="size-5 transition group-hover:translate-x-0.5" aria-hidden />
          </>
        ) : (
          <>
            <UserPlus className="size-4" aria-hidden />
            Adicionar
          </>
        )}
      </button>
    </form>
  );
}
