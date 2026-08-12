/**
 * Contexte de partage global — un seul <ShareModal> monté à la racine de
 * l'app, ouvert depuis n'importe quelle page via useShare().open({...}).
 * Évite de dupliquer showShareModal/setShowShareModal dans chaque page.
 */
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ShareModal, type ShareTargetType } from '../components/ui/ShareModal';

interface ShareParams {
  url: string;
  title: string;
  desc?: string;
  image?: string;
  targetType: ShareTargetType;
  targetId: string;
  onShared?: () => void;
}

interface ShareContextValue {
  open: (params: ShareParams) => void;
}

const Ctx = createContext<ShareContextValue>({ open: () => {} });

export const ShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [params, setParams] = useState<ShareParams | null>(null);

  const open = useCallback((p: ShareParams) => setParams(p), []);
  const close = useCallback(() => setParams(null), []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {params && (
        <ShareModal
          open
          onClose={close}
          url={params.url}
          title={params.title}
          desc={params.desc}
          image={params.image}
          targetType={params.targetType}
          targetId={params.targetId}
          onShared={params.onShared}
        />
      )}
    </Ctx.Provider>
  );
};

export const useShare = () => useContext(Ctx);
