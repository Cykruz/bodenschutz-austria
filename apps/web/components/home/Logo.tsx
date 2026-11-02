export function Logo({ className = 'size-10', light = false }: { className?: string; light?: boolean }) {
  const plate = light ? '#F0A85A' : '#D97B2A';
  const ground = light ? '#F6F3EC' : '#1E3A2F';
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <rect x="2" y="26" width="36" height="8" rx="2" fill={ground} opacity="0.9" />
      <rect x="6" y="14" width="28" height="9" rx="2.5" fill={plate} />
      <rect x="10" y="16.5" width="6" height="4" rx="1" fill={ground} opacity="0.35" />
      <rect x="18" y="16.5" width="6" height="4" rx="1" fill={ground} opacity="0.35" />
      <rect x="26" y="16.5" width="4" height="4" rx="1" fill={ground} opacity="0.35" />
      <rect x="12" y="6" width="16" height="6" rx="2" fill={ground} opacity="0.55" />
    </svg>
  );
}
