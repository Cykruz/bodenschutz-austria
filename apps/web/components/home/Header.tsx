'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS, SITE_NAME } from '@/lib/site';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from './Logo';

export interface HeaderProps {
  /** Dunkle Variante für die Startseite (liegt über der 3D-Bühne). */
  dark?: boolean;
}

export function Header({ dark = false }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const raf = window.requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const onDark = dark && !scrolled && !open;
  const textColor = onDark ? 'text-sand' : 'text-gruen';
  const shell = onDark ? 'bg-transparent' : 'bg-sand/90 backdrop-blur border-b border-linie/70';

  return (
    <header className={`sticky top-0 z-40 transition-colors ${shell}`}>
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-terracotta focus:px-4 focus:py-2 focus:text-white"
      >
        Zum Inhalt springen
      </a>
      <div className="container-site flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className={`flex items-center gap-3 font-heading text-lg font-extrabold ${textColor}`} aria-label={`${SITE_NAME} – Startseite`}>
          <Logo className="size-9" light={onDark} />
          <span className="hidden sm:inline">{SITE_NAME}</span>
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.filter((l) => l.href !== '/anfrage').map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? 'page' : undefined}
              className={`touch flex items-center rounded-full px-4 font-semibold hover:bg-salbei/60 aria-[current=page]:underline aria-[current=page]:underline-offset-8 ${textColor} ${
                onDark ? 'hover:bg-white/10' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/anfrage" className={buttonClasses('primary', 'sm', 'ml-2')}>
            Angebot anfragen
          </Link>
        </nav>

        <button
          type="button"
          className={`touch flex items-center justify-center rounded-full md:hidden ${textColor}`}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-7" aria-hidden /> : <Menu className="size-7" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile Navigation" className="border-t border-linie bg-sand md:hidden">
          <ul className="container-site flex flex-col gap-1 py-4">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={pathname === l.href ? 'page' : undefined}
                  className="touch flex items-center rounded-2xl px-4 text-lg font-semibold text-gruen hover:bg-salbei aria-[current=page]:bg-salbei"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
