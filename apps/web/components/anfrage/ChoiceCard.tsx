import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  text?: string;
  icon?: ReactNode;
  compact?: boolean;
}

/** Große anklickbare Karte als Radio-Option (Tastatur: Pfeiltasten innerhalb der Gruppe). */
export function ChoiceCard({ name, value, checked, onChange, title, text, icon, compact }: ChoiceCardProps) {
  return (
    <label
      className={`tilt relative flex cursor-pointer gap-4 rounded-karte border-2 bg-white transition-colors hover:border-gruen/60 has-focus-visible:outline-3 has-focus-visible:outline-terracotta has-focus-visible:outline-offset-2 ${
        compact ? 'items-center p-4' : 'flex-col p-5 sm:p-6'
      } ${checked ? 'border-gruen shadow-karte' : 'border-linie'}`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      {icon && <span className={`flex shrink-0 items-center justify-center rounded-2xl ${checked ? 'bg-gruen text-white' : 'bg-salbei text-gruen'} ${compact ? 'size-12' : 'size-14'}`}>{icon}</span>}
      <span className="flex-1">
        <span className="block font-heading text-xl font-extrabold text-gruen">{title}</span>
        {text && <span className="mt-1 block text-[0.95rem] text-text">{text}</span>}
      </span>
      <span
        aria-hidden
        className={`absolute top-4 right-4 flex size-7 items-center justify-center rounded-full border-2 ${checked ? 'border-gruen bg-gruen text-white' : 'border-linie bg-white'}`}
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
    </label>
  );
}
