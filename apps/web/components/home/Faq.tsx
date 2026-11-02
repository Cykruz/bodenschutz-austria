import { ChevronDown } from 'lucide-react';
import { FAQ_HOME } from '@/lib/faq';
import { SectionHeading } from '@/components/ui/SectionHeading';

export function Faq() {
  return (
    <section id="faq" className="bg-sand py-20 sm:py-28" aria-labelledby="faq-title">
      <div className="container-site grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow="Häufige Fragen" title={<span id="faq-title">Kurz beantwortet.</span>} />
        </div>
        <div className="space-y-3 lg:col-span-8">
          {FAQ_HOME.map((item) => (
            <details key={item.question} className="group karte open:shadow-karte">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-heading text-lg font-extrabold text-gruen marker:content-none [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-6 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-6 pb-6 text-lg text-text">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
