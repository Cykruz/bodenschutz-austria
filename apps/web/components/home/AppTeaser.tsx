import Link from 'next/link';
import { Download, Smartphone } from 'lucide-react';
import { ANDROID_APK_URL, PLACEHOLDER } from '@/lib/site';
import { SectionHeading } from '@/components/ui/SectionHeading';

export function AppTeaser() {
  return (
    <section id="app" className="bg-gruen py-20 text-sand sm:py-28" aria-labelledby="app-title">
      <div className="container-site grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading dark eyebrow="Die App" title={<span id="app-title">Foto, Maße, Anfrage. Direkt vom Platz.</span>} text="Für Android und iPhone. Oder ohne Installation direkt hier auf der Website." />
          <div className="mt-8 flex flex-wrap gap-3">
            {ANDROID_APK_URL ? (
              <a href={ANDROID_APK_URL} rel="noopener" className="btn-grow inline-flex min-h-[56px] items-center gap-2 rounded-full bg-sand px-7 font-heading text-lg font-extrabold text-gruen hover:bg-white">
                <Download className="size-5" aria-hidden /> Für Android (APK)
              </a>
            ) : (
              <span className="inline-flex min-h-[56px] items-center gap-2 rounded-full border-2 border-dashed border-sand/40 px-7 font-heading text-lg font-extrabold text-sand/80" aria-label="Android-Download folgt">
                <Smartphone className="size-5" aria-hidden /> Für Android · {PLACEHOLDER.playStore}
              </span>
            )}
            <span className="inline-flex min-h-[56px] items-center gap-2 rounded-full border-2 border-dashed border-sand/40 px-7 font-heading text-lg font-extrabold text-sand/80" aria-label="iPhone-Download folgt">
              <Smartphone className="size-5" aria-hidden /> Für iPhone · {PLACEHOLDER.appStore}
            </span>
          </div>
          <p className="mt-6 text-[#C9D6CC]">
            Noch keine App?{' '}
            <Link href="/anfrage" className="font-bold text-akzent underline underline-offset-4 hover:text-white">
              Anfrage direkt hier starten
            </Link>
            {' '}·{' '}
            <Link href="/app" className="font-bold text-akzent underline underline-offset-4 hover:text-white">
              Mehr zur App
            </Link>
          </p>
        </div>
        <div className="mx-auto w-[280px] rounded-[44px] border-[10px] border-gruen-dunkel bg-sand p-5 text-gruen shadow-karte" aria-hidden>
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gruen-dunkel/60" />
          <p className="text-[11px] font-bold text-terracotta-text">Schritt 3 von 6 · Maße</p>
          <p className="mt-2 font-heading text-xl leading-tight font-extrabold">Wie groß ist die Fläche?</p>
          <div className="mt-4 rounded-2xl border-2 border-gruen/30 bg-white px-4 py-3 font-heading text-3xl font-extrabold">
            120 <span className="text-base text-text">m²</span>
          </div>
          <div className="mt-3 flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-gruen px-3 py-1.5 text-white">Fläche</span>
            <span className="rounded-full bg-salbei px-3 py-1.5">Fahrspuren</span>
          </div>
          <div className="mt-4 rounded-2xl bg-salbei px-4 py-3">
            <p className="text-[10px] font-semibold text-text">Ergebnis</p>
            <p className="font-heading font-extrabold">46 Platten · 2 Paletten</p>
            <p className="text-[10px] text-terracotta-text">vorläufig</p>
          </div>
          <div className="mt-4 rounded-full bg-terracotta py-2.5 text-center text-sm font-extrabold text-gruen-dunkel">Weiter</div>
        </div>
      </div>
    </section>
  );
}
