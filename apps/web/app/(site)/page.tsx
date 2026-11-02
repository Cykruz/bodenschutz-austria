import { ButtonLink } from '@/components/ui/Button';

// Vorläufige Startseite – wird nach docs/DESIGN-RICHTUNG.md final umgesetzt.
export default function HomePage() {
  return (
    <div className="container-site py-20">
      <h1 className="text-4xl sm:text-6xl">Fester Boden. Genau dort, wo du ihn brauchst.</h1>
      <div className="mt-8">
        <ButtonLink href="/anfrage" size="lg">
          Angebot anfragen
        </ButtonLink>
      </div>
    </div>
  );
}
