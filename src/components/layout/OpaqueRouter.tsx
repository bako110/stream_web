import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Router, type Location, type NavigateOptions, type To, type NavigationType } from 'react-router-dom';
import { toOpaquePath, toRealPath } from '../../utils/opaquePaths';

// Équivalent de BrowserRouter, mais la barre d'adresse montre des chemins
// opaques. Toute l'app continue de manipuler les chemins réels : on traduit
// à l'entrée (lecture de window.location) et à la sortie (push/replace/href).

interface HistState { usr: unknown; key: string; idx: number }

const newKey = () => Math.random().toString(36).slice(2, 10);

function readLocation(): Location {
  const { pathname, search, hash } = window.location;
  const st = (window.history.state ?? {}) as Partial<HistState>;
  return { pathname: toRealPath(pathname), search, hash, state: st.usr ?? null, key: st.key ?? 'default' };
}

function resolveTo(to: To): { pathname: string; search: string; hash: string } {
  const cur = window.location;
  if (typeof to === 'string') {
    const u = new URL(to, cur.origin + toRealPath(cur.pathname) + cur.search);
    return { pathname: u.pathname, search: u.search, hash: u.hash };
  }
  return { pathname: to.pathname ?? toRealPath(cur.pathname), search: to.search ?? '', hash: to.hash ?? '' };
}

function toHref(to: To): string {
  const r = resolveTo(to);
  return toOpaquePath(r.pathname) + r.search + r.hash;
}

export function OpaqueRouter({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ location: Location; action: NavigationType }>(() => ({
    location: readLocation(), action: 'POP' as NavigationType,
  }));
  const idx = useRef<number>(((window.history.state ?? {}) as Partial<HistState>).idx ?? 0);

  // Ancien lien (chemin réel) ouvert directement : on réécrit l'adresse affichée.
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const shown = toOpaquePath(pathname);
    const st = (window.history.state ?? {}) as Partial<HistState>;
    if (shown !== pathname || st.key == null) {
      window.history.replaceState({ usr: st.usr ?? null, key: st.key ?? newKey(), idx: idx.current }, '', shown + search + hash);
      setState({ location: readLocation(), action: 'POP' as NavigationType });
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      idx.current = ((window.history.state ?? {}) as Partial<HistState>).idx ?? 0;
      setState({ location: readLocation(), action: 'POP' as NavigationType });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const write = useCallback((mode: 'push' | 'replace', to: To, usr: unknown) => {
    const href = toHref(to);
    if (mode === 'push') idx.current += 1;
    const hs: HistState = { usr: usr ?? null, key: newKey(), idx: idx.current };
    try {
      if (mode === 'push') window.history.pushState(hs, '', href);
      else window.history.replaceState(hs, '', href);
    } catch {
      window.location.assign(href);
      return;
    }
    setState({ location: readLocation(), action: (mode === 'push' ? 'PUSH' : 'REPLACE') as NavigationType });
  }, []);

  const navigator = useMemo(() => ({
    createHref: toHref,
    encodeLocation: (to: To) => {
      const r = resolveTo(to);
      return { pathname: r.pathname, search: r.search, hash: r.hash };
    },
    go: (n: number) => window.history.go(n),
    push: (to: To, usr?: unknown, _opts?: NavigateOptions) => write('push', to, usr),
    replace: (to: To, usr?: unknown, _opts?: NavigateOptions) => write('replace', to, usr),
  }), [write]);

  return (
    <Router location={state.location} navigationType={state.action} navigator={navigator}>
      {children}
    </Router>
  );
}
