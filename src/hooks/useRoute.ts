import { useEffect, useState } from 'react';

export type Route = 'public' | 'admin';

/**
 * Roteamento mínimo, sem dependências.
 * Aceita `/admin` (requer rewrite para index.html na hospedagem), `#admin`
 * e `#/admin` (os dois últimos funcionam em qualquer hospedagem estática).
 */
function resolveRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash.replace(/^#/, '').replace(/\/+$/, '');
  return path.endsWith('/admin') || hash === '/admin' || hash === 'admin' ? 'admin' : 'public';
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(resolveRoute);
  useEffect(() => {
    const update = () => setRoute(resolveRoute());
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return route;
}

export function navigate(route: Route) {
  window.location.hash = route === 'admin' ? 'admin' : '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
