import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MoreMenuContent } from '../components/layout/MoreMenuContent';

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border sticky top-2 mx-2 sm:mx-4 mt-2 mb-2 rounded-full z-10" style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: '0 8px 20px rgba(11,11,16,0.08)' }}>
        <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Plus</h1>
      </div>

      <div className="px-3 py-3 w-full mx-auto">
        <MoreMenuContent />
      </div>
    </div>
  );
}
