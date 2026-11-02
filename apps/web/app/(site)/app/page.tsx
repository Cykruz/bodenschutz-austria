import type { Metadata } from 'next';
import { Camera, Download, Smartphone, Globe } from 'lucide-react';
import { ANDROID_APK_URL, PLACEHOLDER } from '@/lib/site';
import { ButtonLink } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ClipAblauf } from '@/components/clips/ClipAblauf';

export const metadata: Metadata = {
  title: 'App für Android und iPhone',
  description: 'Die Bodenschutz-Austria-App: Vorhaben wählen, Boden fotografieren, Mengen sehen, Anfrage senden. Für Android und iPhone – oder direkt hier auf der Website.',
  alternates: { canonical: '/app' },
};

export default function AppPage() {
  return (
    <div className="container-site py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold tracking-wide text-terracotta-text uppercase">Die App</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Der Berater für die Hosentasche.</h1>
        <p className="mt-4 max-w-2xl text-lg text-text">
          Direkt von der Baustelle, vom Festgelände oder vom Paddock aus: Vorhaben wählen, ein Foto vom Boden machen, Fläche eintippen – und sofort sehen, wie viele
          Platten und Paletten es werden. Dann Anfrage senden. Fertig.
        </p>

        <ClipAblauf className="mt-8" caption="So läuft es in der App: Foto, Zahlen, Anfrage – und Mario gibt frei." />

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Camera, title: 'Foto vom Boden', text: 'Die Kamera hilft bei der Einordnung des Untergrunds. Freiwillig, nur zur Orientierung.' },
            { icon: Smartphone, title: 'Mengen sofort', text: 'Platten und Paletten nach festen Regeln, inklusive Alternative mit vollen Paletten.' },
            { icon: Globe, title: 'Gleiche Anfrage wie online', text: 'App und Website nutzen denselben Berater. Du entscheidest, was dir lieber ist.' },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="karte tilt p-5">
              <Icon className="size-8 text-gruen" aria-hidden />
              <h2 className="mt-3 text-xl">{title}</h2>
              <p className="mt-1 text-text">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <section className="karte p-6 sm:p-8" aria-labelledby="android">
            <h2 id="android" className="text-2xl">
              Für Android
            </h2>
            <p className="mt-2 text-text">Im Google Play Store oder als direkte Installationsdatei (APK).</p>
            <div className="mt-5 flex flex-col gap-3">
              <span className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-dashed border-linie px-5 font-semibold text-text/80" aria-label="Play-Store-Link folgt">
                {PLACEHOLDER.playStore}
              </span>
              {ANDROID_APK_URL ? (
                <a
                  href={ANDROID_APK_URL}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gruen px-6 font-heading font-bold text-white hover:bg-gruen-hell"
                  rel="noopener"
                >
                  <Download className="size-5" aria-hidden /> APK direkt herunterladen
                </a>
              ) : (
                <p className="text-sm text-text/80">Der direkte APK-Download wird freigeschaltet, sobald die erste Testversion fertig ist.</p>
              )}
            </div>
          </section>
          <section className="karte p-6 sm:p-8" aria-labelledby="iphone">
            <h2 id="iphone" className="text-2xl">
              Für iPhone
            </h2>
            <p className="mt-2 text-text">Im Apple App Store, sobald die Prüfung durch Apple abgeschlossen ist.</p>
            <div className="mt-5">
              <span className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border-2 border-dashed border-linie px-5 font-semibold text-text/80" aria-label="App-Store-Link folgt">
                {PLACEHOLDER.appStore}
              </span>
            </div>
          </section>
        </div>

        <Notice tone="info" title="Auch ohne App direkt hier nutzbar." className="mt-8">
          Der Berater läuft genauso auf der Website – auf Handy, Tablet und Computer. Nichts installieren, nichts anmelden.
        </Notice>
        <div className="mt-6">
          <ButtonLink href="/anfrage" size="lg">
            Jetzt ohne App anfragen
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
