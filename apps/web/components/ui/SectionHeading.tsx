import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = 'left',
  dark,
}: {
  eyebrow?: string;
  title: ReactNode;
  text?: ReactNode;
  align?: 'left' | 'center';
  dark?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <p className={`mb-3 text-sm font-bold tracking-wide uppercase ${dark ? 'text-akzent' : 'text-terracotta-text'}`}>{eyebrow}</p>}
      <h2 className={`text-3xl sm:text-4xl ${dark ? 'text-white' : ''}`}>{title}</h2>
      {text && <p className={`mt-4 text-lg ${dark ? 'text-white/80' : 'text-text'}`}>{text}</p>}
    </div>
  );
}
