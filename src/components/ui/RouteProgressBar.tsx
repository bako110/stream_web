import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Barre de progression de navigation (style YouTube/GitHub) — se déclenche à
 * CHAQUE changement de route et couvre le trou que Suspense ne couvre pas :
 * Suspense (App.tsx) n'affiche GlobalLoader que pendant le chargement du CODE
 * de la page (le bundle lazy) — une fois ce bundle en cache (page déjà visitée
 * une fois dans la session), Suspense ne se redéclenche plus, et le composant
 * se monte immédiatement avec ses données pas encore chargées. Chaque page
 * gère cet état de chargement DE DONNÉES à sa manière (certaines ont un
 * PageLoader/skeleton interne, beaucoup n'en ont aucun) — d'où l'incohérence
 * observée : l'URL change instantanément (React Router est synchrone) mais le
 * contenu reste vide un moment, sans aucun feedback visuel entre les deux.
 *
 * Plutôt que d'auditer et corriger individuellement ~90 pages, cette barre
 * donne un feedback systématique dès le clic sur CHAQUE route, avant même que
 * le composant de la page ne s'affiche — complémentaire (pas redondante) avec
 * les PageLoader/skeletons déjà présents dans certaines pages.
 *
 * Heuristique : progression simulée qui avance par paliers ralentis (jamais
 * 100% tant que la route n'a pas changé une seconde fois / que le nouveau
 * contenu n'a pas eu le temps de peindre), puis complétion rapide au prochain
 * paint — pas d'instrumentation de chaque fetch individuel nécessaire.
 */
export function RouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Ignore le tout premier montage — la navigation initiale est déjà
    // couverte par isInitializing/GlobalLoader dans App.tsx, pas besoin de
    // superposer une seconde barre au chargement initial de l'app.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setVisible(true);
    setProgress(15);

    // Paliers de progression simulée — ralentit à l'approche de 90% pour ne
    // jamais donner l'impression que c'est fini avant que ce soit vrai.
    timersRef.current.push(setTimeout(() => setProgress(40), 80));
    timersRef.current.push(setTimeout(() => setProgress(65), 220));
    timersRef.current.push(setTimeout(() => setProgress(82), 450));
    timersRef.current.push(setTimeout(() => setProgress(90), 800));

    // Complétion — le nouveau composant de page a normalement eu le temps de
    // monter et de peindre son premier contenu (données déjà en cache
    // client, skeleton, ou au pire son propre PageLoader) à ce stade.
    timersRef.current.push(setTimeout(() => {
      setProgress(100);
      timersRef.current.push(setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200));
    }, 500));

    return () => { timersRef.current.forEach(clearTimeout); };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] pointer-events-none"
      style={{ height: 3 }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg,#7B3FF2,#F0365A)',
          boxShadow: '0 0 8px rgba(123,63,242,0.6)',
          transition: progress === 100
            ? 'width 150ms ease-out, opacity 200ms ease-out 150ms'
            : 'width 350ms ease-out',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
