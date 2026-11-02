import { Loader2 } from 'lucide-react';

export function Spinner({ label = 'Wird geladen …' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-6 text-text/80">
      <Loader2 className="size-6 animate-spin text-gruen" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
