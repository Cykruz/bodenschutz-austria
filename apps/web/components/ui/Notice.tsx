import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';

type Tone = 'info' | 'warn' | 'error' | 'ok';

const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: 'bg-salbei border-salbei-dunkel text-gruen', icon: <Info className="size-5 shrink-0" aria-hidden /> },
  warn: { box: 'bg-warn-hell border-akzent text-warn', icon: <AlertTriangle className="size-5 shrink-0" aria-hidden /> },
  error: { box: 'bg-fehler-hell border-fehler/40 text-fehler', icon: <OctagonAlert className="size-5 shrink-0" aria-hidden /> },
  ok: { box: 'bg-ok-hell border-ok/40 text-ok', icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden /> },
};

export function Notice({ tone = 'info', title, children, className = '' }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-2xl border px-4 py-3 ${t.box} ${className}`}>
      <span className="mt-0.5">{t.icon}</span>
      <div className="text-[0.95rem] leading-snug">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
      </div>
    </div>
  );
}
