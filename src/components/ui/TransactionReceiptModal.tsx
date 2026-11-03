import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Copy, Check, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export interface Receipt {
  id: string;
  type: string;
  typeLabel?: string;
  status?: 'completed' | 'pending' | 'failed';
  gogold: number;
  eur?: number | null;
  description?: string | null;
  balanceAfter?: number | null;
  date: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  credit_purchase: 'Achat de GoGold',
  gift_sent: 'Cadeau envoyé',
  gift_received: 'Cadeau reçu',
  transfer_sent: 'Transfert envoyé',
  transfer_received: 'Transfert reçu',
  withdrawal: 'Retrait',
  subscription_revenue: "Revenu d'abonnement",
  view_revenue: 'Revenu de vues',
  bonus: 'Bonus',
  refund: 'Remboursement',
  boost_purchase: 'Achat de boost',
  referral_bonus: 'Bonus de parrainage',
  community_entry: 'Adhésion à une communauté',
  community_reward: 'Récompense de communauté',
  verification_fee: 'Frais de vérification',
  verification_refund: 'Remboursement de vérification',
  content_purchase: 'Achat de contenu / abonnement',
  live_purchase: 'Programmation de live',
  ticket_sold: 'Achat de billet',
  ticket_earned: 'Vente de billet',
  ad_revenue: 'Revenu publicitaire',
  community_pro_subscription: 'Abonnement communauté Pro',
  community_cotisation: 'Cotisation communautaire',
  tournament_entry_fee: "Inscription à un tournoi",
  battle_forfeit_penalty: 'Pénalité de battle',
  battle_forfeit_compensation: 'Compensation de battle',
  tournament_prize: 'Récompense de tournoi',
};

export function txTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

const STATUS = {
  completed: { label: 'Terminée', color: '#16A34A', Icon: CheckCircle2 },
  pending:   { label: 'En attente', color: '#D97706', Icon: Clock },
  failed:    { label: 'Échouée', color: '#DC2626', Icon: XCircle },
} as const;

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function TransactionReceiptModal({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!receipt) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [receipt, onClose]);

  if (!receipt) return null;

  const credit = receipt.gogold >= 0;
  const st = STATUS[receipt.status ?? 'completed'];
  const date = new Date(receipt.date);
  const dateLong = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeLong = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const holder = user?.display_name ?? user?.username ?? '';

  const rows: [string, string][] = [
    ['Type', receipt.typeLabel ?? txTypeLabel(receipt.type)],
    ['Date', `${dateLong} à ${timeLong}`],
    ['Statut', st.label],
    ...(receipt.description ? [['Description', receipt.description] as [string, string]] : []),
    ...(receipt.referenceType ? [['Référence', `${receipt.referenceType}${receipt.referenceId ? ` · ${receipt.referenceId}` : ''}`] as [string, string]] : []),
    ...(receipt.balanceAfter != null ? [['Solde après opération', `${receipt.balanceAfter.toLocaleString('fr-FR')} GoGold`] as [string, string]] : []),
    ...(holder ? [['Titulaire du compte', holder] as [string, string]] : []),
  ];

  function print() {
    const prevTitle = document.title;
    document.title = `Recu-Gofolyx-${receipt!.id}`;
    document.body.classList.add('tx-printing');
    const done = () => {
      document.body.classList.remove('tx-printing');
      document.title = prevTitle;
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  async function copyId() {
    try { await navigator.clipboard.writeText(receipt!.id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* presse-papiers indisponible */ }
  }

  return createPortal(
    <div className="tx-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tx-sheet" role="dialog" aria-modal="true" aria-label="Détail de la transaction">
        <div className="tx-actions tx-noprint">
          <button onClick={print} className="tx-btn tx-btn-primary"><Printer size={15} /> Imprimer / PDF</button>
          <button onClick={copyId} className="tx-btn">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copié' : 'Copier le n°'}</button>
          <button onClick={onClose} className="tx-btn tx-btn-icon" aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className="tx-receipt">
          <div className="tx-head">
            <div>
              <p className="tx-brand">Gofolyx</p>
              <p className="tx-doc">Reçu de transaction</p>
            </div>
            <div className="tx-ref">
              <p className="tx-ref-label">N° de transaction</p>
              <p className="tx-ref-val">{receipt.id}</p>
            </div>
          </div>

          <div className="tx-amount">
            <p className="tx-amount-val" style={{ color: credit ? '#16A34A' : '#111827' }}>
              {credit ? '+' : ''}{receipt.gogold.toLocaleString('fr-FR')} <span>GoGold</span>
            </p>
            {receipt.eur != null && <p className="tx-amount-eur">≈ {fmtEur(Math.abs(receipt.eur))}</p>}
            <span className="tx-status" style={{ color: st.color, background: `${st.color}18` }}>
              <st.Icon size={13} /> {st.label}
            </span>
          </div>

          <dl className="tx-rows">
            {rows.map(([k, v]) => (
              <div key={k} className="tx-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <p className="tx-foot">
            Document généré le {new Date().toLocaleDateString('fr-FR')} depuis gofolyx.com. Ce reçu atteste de l'opération enregistrée sur votre portefeuille GoGold.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
