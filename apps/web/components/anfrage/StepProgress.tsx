import { Check } from 'lucide-react';

export const STEPS = ['Vorhaben', 'Foto', 'Maße', 'Mengen', 'Kontakt', 'Senden'] as const;

export function StepProgress({ current, onJump }: { current: number; onJump?: (step: number) => void }) {
  const pct = Math.round(((current - 1) / (STEPS.length - 1)) * 100);
  return (
    <nav aria-label="Fortschritt" className="mb-8">
      <p className="mb-2 text-sm font-bold text-terracotta-text">
        Schritt {current} von {STEPS.length}: {STEPS[current - 1]}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-salbei-dunkel" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Fortschritt des Assistenten">
        {/* Breite über transform statt width: ruckelfrei und ohne Layout-Arbeit */}
        <div
          className="h-full w-full origin-left rounded-full bg-gruen transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${Math.max(pct, 4) / 100})` }}
        />
      </div>
      <ol className="mt-3 hidden justify-between text-xs font-semibold sm:flex">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          const clickable = done && onJump;
          return (
            <li key={label} className={`flex items-center gap-1 ${active ? 'text-gruen' : done ? 'text-gruen/80' : 'text-text/50'}`} aria-current={active ? 'step' : undefined}>
              {clickable ? (
                <button type="button" onClick={() => onJump(n)} className="touch flex items-center gap-1 rounded-full px-2 hover:underline">
                  <Check className="size-3.5" aria-hidden /> {label}
                </button>
              ) : (
                <span className="flex items-center gap-1 px-2">
                  {done && <Check className="size-3.5" aria-hidden />}
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
