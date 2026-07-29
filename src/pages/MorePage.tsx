import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MoreMenuContent } from '../components/layout/MoreMenuContent';

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      <div className="flex items-center gap-3 px-4 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
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
