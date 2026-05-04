interface Props { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; }

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-[var(--text-tertiary)] mb-4 opacity-50">{icon}</div>}
      <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-[var(--text-secondary)] text-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
