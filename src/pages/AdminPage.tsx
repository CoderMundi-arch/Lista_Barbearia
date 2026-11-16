import { Header } from '../components/Header';
import { AdminPanel } from '../components/AdminPanel';
import { useQueue } from '../context/QueueContext';

export function AdminPage() {
  const { state } = useQueue();
  return (
    <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Header variant="admin" date={state.date} />
      <main className="mx-auto max-w-5xl animate-fade-up px-4 pt-5 sm:px-6 sm:pt-8">
        <AdminPanel />
      </main>
    </div>
  );
}
