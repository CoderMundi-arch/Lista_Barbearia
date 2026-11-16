import { useCallback, useEffect, useMemo } from 'react';
import { QueueProvider } from './context/QueueContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LocalStorageQueueRepository } from './services/LocalStorageQueueRepository';
import type { QueueNotice, QueueRepository } from './services/QueueRepository';
import { useRoute } from './hooks/useRoute';
import { PublicPage } from './pages/PublicPage';
import { AdminPage } from './pages/AdminPage';
import { APP_CONFIG } from './config/app';

/**
 * Para integrar um banco de dados no futuro, crie outra classe que implemente
 * `QueueRepository` (ex.: SupabaseQueueRepository) e troque apenas esta linha.
 */
function createRepository(): QueueRepository {
  return new LocalStorageQueueRepository();
}

function AppRoutes() {
  const route = useRoute();
  const { notify } = useToast();
  const repository = useMemo(createRepository, []);

  useEffect(() => {
    document.title =
      route === 'admin' ? `Painel do barbeiro · ${APP_CONFIG.businessName}` : `Fila de atendimento · ${APP_CONFIG.businessName}`;
  }, [route]);

  const handleNotice = useCallback(
    (notice: QueueNotice) => {
      if (notice.type === 'recovered-from-corruption') {
        notify('warning', 'Dados da fila recuperados', 'Encontramos informações inválidas salvas e iniciamos uma fila nova.');
      } else if (notice.type === 'new-day') {
        notify('info', 'Novo dia, nova fila', 'A lista de hoje começou vazia.');
      }
    },
    [notify],
  );

  return (
    <QueueProvider repository={repository} onNotice={handleNotice}>
      {route === 'admin' ? <AdminPage /> : <PublicPage />}
    </QueueProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
