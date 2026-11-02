import type { ReactNode } from 'react';

type Tone = 'neutral' | 'green' | 'orange' | 'red' | 'blue' | 'placeholder';

const tones: Record<Tone, string> = {
  neutral: 'bg-sand-dunkel text-text-dunkel',
  green: 'bg-ok-hell text-ok',
  orange: 'bg-warn-hell text-warn',
  red: 'bg-fehler-hell text-fehler',
  blue: 'bg-salbei text-gruen',
  placeholder: 'bg-warn-hell text-warn border border-akzent',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PlaceholderBadge({ short }: { short?: boolean }) {
  return <Badge tone="placeholder">{short ? 'Platzhalter' : 'Platzhalter, von Mario zu bestätigen'}</Badge>;
}

const statusTone: Record<string, Tone> = {
  NEW: 'blue',
  DRAFT: 'orange',
  QUESTION: 'orange',
  APPROVED: 'green',
  SENT: 'green',
  REJECTED: 'red',
  IGNORED: 'neutral',
  STANDARD: 'green',
  REVIEW: 'orange',
  UNRELATED: 'neutral',
};

export function StatusBadge({ value, label }: { value: string; label: string }) {
  return <Badge tone={statusTone[value] ?? 'neutral'}>{label}</Badge>;
}
