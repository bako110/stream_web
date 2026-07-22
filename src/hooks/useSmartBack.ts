import { useNavigate } from 'react-router-dom';

/**
 * Retour "intelligent" pour les pages accessibles via lien partagé — navigate(-1) seul
 * suppose un historique interne à l'app, absent quand l'utilisateur arrive directement
 * depuis WhatsApp/Facebook/un nouvel onglet. Dans ce cas on retombe sur `fallback`
 * plutôt que de sortir l'utilisateur du site ou de ne rien faire.
 */
export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  return () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
