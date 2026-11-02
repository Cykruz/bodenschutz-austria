'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Boxes, ExternalLink, Inbox, LayoutDashboard, LogOut, Map, Menu, MessageSquare, ScrollText, Settings, SlidersHorizontal, X } from 'lucide-react';
import { admin, describeError, IS_MOCK } from '@/lib/api';
import type { AdminUser } from '@/lib/types';
import { Logo } from '@/components/home/Logo';
import { Spinner } from '@/components/ui/Spinner';

const NAV = [
  { href: '/admin', label: 'Übersicht', icon: LayoutDashboard },
  { href: '/admin/anfragen', label: 'Anfragen', icon: Inbox },
  { href: '/admin/posteingang', label: 'Posteingang', icon: MessageSquare },
  { href: '/admin/produkte', label: 'Produkte', icon: Boxes },
  { href: '/admin/frachtzonen', label: 'Frachtzonen', icon: Map },
  { href: '/admin/regeln', label: 'Regeln', icon: SlidersHorizontal },
  { href: '/admin/einstellungen', label: 'Einstellungen', icon: Settings },
  { href: '/admin/protokoll', label: 'Protokoll', icon: ScrollText },
] as const;

const AdminContext = createContext<{ user: AdminUser | null; refresh: () => void }>({ user: null, refresh: () => {} });
export const useAdmin = () => useContext(AdminContext);

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const checking = !isLogin && checkedPath !== pathname;

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const check = useCallback(() => {
    let cancelled = false;
    admin
      .me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setCheckedPath(pathname);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        router.replace(`/admin/login?weiter=${encodeURIComponent(pathname)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (isLogin) return;
    return check();
  }, [check, isLogin]);

  async function logout() {
    try {
      await admin.logout();
    } catch (err) {
      console.warn(describeError(err));
    }
    setUser(null);
    router.replace('/admin/login');
  }

  if (isLogin) {
    return <main className="flex flex-1 items-center justify-center bg-sand px-4 py-10">{children}</main>;
  }

  return (
    <AdminContext.Provider value={{ user, refresh: check }}>
      <div className="flex min-h-screen flex-1 bg-sand">
        <a href="#admin-inhalt" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-terracotta focus:px-4 focus:py-2 focus:text-white">
          Zum Inhalt springen
        </a>

        {/* Seitenleiste */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gruen text-sand transition-transform lg:static lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Verwaltungsmenü"
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Link href="/admin" className="flex items-center gap-3 font-heading text-lg font-extrabold text-white">
              <Logo light className="size-9" />
              Verwaltung
            </Link>
            <button type="button" className="touch flex items-center justify-center rounded-full hover:bg-white/10 lg:hidden" aria-label="Menü schließen" onClick={() => setOpen(false)}>
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <nav className="flex-1 px-3">
            <ul className="space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-semibold hover:bg-white/10 ${active ? 'bg-white/15 text-white' : 'text-sand/85'}`}
                    >
                      <Icon className="size-5" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-white/15 px-5 py-4 text-sm">
            {user && <p className="truncate text-sand/80">Angemeldet: {user.email}</p>}
            <div className="mt-2 flex flex-col gap-1">
              <Link href="/" className="touch inline-flex items-center gap-2 text-sand/85 hover:text-white">
                <ExternalLink className="size-4" aria-hidden /> Zur Website
              </Link>
              <button type="button" onClick={logout} className="touch inline-flex items-center gap-2 text-left text-sand/85 hover:text-white">
                <LogOut className="size-4" aria-hidden /> Abmelden
              </button>
            </div>
          </div>
        </aside>
        {open && <button type="button" className="fixed inset-0 z-30 bg-gruen-dunkel/50 lg:hidden" aria-label="Menü schließen" onClick={() => setOpen(false)} />}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-linie bg-white px-4 py-3 lg:hidden">
            <button type="button" className="touch flex items-center justify-center rounded-full text-gruen hover:bg-sand" aria-label="Menü öffnen" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu className="size-7" aria-hidden />
            </button>
            <span className="font-heading text-lg font-extrabold text-gruen">Verwaltung</span>
          </header>
          {IS_MOCK && (
            <p className="bg-warn-hell px-4 py-2 text-center text-sm font-semibold text-warn" role="status">
              Vorführmodus mit Beispieldaten (NEXT_PUBLIC_MOCK_API=true). Änderungen werden nicht gespeichert.
            </p>
          )}
          <main id="admin-inhalt" className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            {checking || !user ? <Spinner label="Anmeldung wird geprüft …" /> : children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
