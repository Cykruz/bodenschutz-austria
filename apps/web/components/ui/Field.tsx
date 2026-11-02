import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

const inputBase =
  'w-full rounded-2xl border-2 border-linie bg-white px-4 py-3 text-base text-text-dunkel placeholder:text-text/50 min-h-[52px] focus:border-gruen focus:outline-none aria-[invalid=true]:border-fehler disabled:bg-sand';

export const inputClasses = inputBase;

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className = '' }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-semibold text-gruen">
        {label}
        {required ? <span className="text-terracotta-text"> *</span> : <span className="text-text/60 font-normal"> (optional)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-sm text-text/80">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-fehler">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`${inputBase} min-h-[120px] ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={`${inputBase} ${className}`} {...rest}>
      {children}
    </select>
  );
}
