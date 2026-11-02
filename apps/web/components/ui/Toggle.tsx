'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  warn?: boolean;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, warn, disabled }: ToggleProps) {
  const onColor = warn ? 'bg-warn' : 'bg-gruen';
  return (
    <label className={`flex items-start gap-4 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className={`block h-8 w-14 rounded-full transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-terracotta peer-focus-visible:outline-offset-2 ${
            checked ? onColor : 'bg-linie'
          }`}
        />
        <span
          aria-hidden
          className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : ''}`}
        />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold text-gruen">{label}</span>
        {description && <span className="text-sm text-text/80">{description}</span>}
      </span>
    </label>
  );
}
