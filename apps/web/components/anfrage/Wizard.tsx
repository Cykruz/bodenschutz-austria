'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Camera, HardHat, PawPrint, Tent, Truck, Construction, HelpCircle, ImagePlus, Trash2, Send } from 'lucide-react';
import { analyzePhoto, calculate, createInquiry, describeError, getProducts } from '@/lib/api';
import { PRINCIPLES, PROJECT_TYPE_LABELS, UNLOADING_LABELS } from '@/lib/site';
import { fieldErrors, kontaktSchema, massenSchema } from '@/lib/schema';
import type { CalculationResult, InquiryCreateInput, MeasureMode, PhotoAnalysis, ProductSpec, ProjectType, Unloading } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { Toggle } from '@/components/ui/Toggle';
import { PlaceholderBadge } from '@/components/ui/Badge';
import { ChoiceCard } from './ChoiceCard';
import { MengenErgebnis } from './MengenErgebnis';
import { STEPS, StepProgress } from './StepProgress';

interface WizardState {
  projectType?: ProjectType;
  photoFile?: File;
  photoPreview?: string;
  analysis?: PhotoAnalysis;
  mode: MeasureMode;
  areaM2: string;
  lengthM: string;
  laneCount: number;
  productId: string;
  postalCode: string;
  calculation?: CalculationResult;
  customerName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  unloading?: Unloading;
  notes: string;
  rentalRequested: boolean;
  privacy: boolean;
}

const initialState: WizardState = {
  mode: 'AREA',
  areaM2: '',
  lengthM: '',
  laneCount: 2,
  productId: '',
  postalCode: '',
  customerName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  notes: '',
  rentalRequested: false,
  privacy: false,
};

const PROJECT_OPTIONS: { value: ProjectType; title: string; text: string; icon: React.ReactNode }[] = [
  { value: 'CONSTRUCTION', title: 'Baustelle', text: 'Zufahrten, Kranstellflächen, Lagerflächen – befahrbarer Boden ohne Standzeiten.', icon: <HardHat className="size-7" aria-hidden /> },
  { value: 'EVENT', title: 'Veranstaltung', text: 'Event-Wege, Feuerwehrzufahrt, grüner Parkplatz – Bodenschutz ohne Versiegelung.', icon: <Tent className="size-7" aria-hidden /> },
  { value: 'PADDOCK', title: 'Paddock', text: 'Matschfreie Ausläufe und Wege für Pferde, das ganze Jahr.', icon: <PawPrint className="size-7" aria-hidden /> },
];

const UNLOADING_OPTIONS: { value: Unloading; text: string; icon: React.ReactNode }[] = [
  { value: 'FORKLIFT', text: 'Vor Ort kann ein Stapler die Paletten abladen.', icon: <Construction className="size-6" aria-hidden /> },
  { value: 'CRANE_NEEDED', text: 'Kein Stapler da – der LKW braucht einen Kran.', icon: <Truck className="size-6" aria-hidden /> },
  { value: 'UNKNOWN', text: 'Noch unklar – wir klären das gemeinsam.', icon: <HelpCircle className="size-6" aria-hidden /> },
];

export function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [s, setS] = useState<WizardState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductSpec[] | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();

  /** Nach fehlgeschlagener Prüfung zum ersten Fehler scrollen. */
  function showErrors(next: Record<string, string>) {
    setErrors(next);
    window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
      el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      if (el?.matches('input, textarea, select')) el.focus({ preventScroll: true });
    });
  }

  const update = useCallback((patch: Partial<WizardState>) => setS((prev) => ({ ...prev, ...patch })), []);

  useEffect(() => {
    getProducts()
      .then((list) => {
        setProducts(list);
        setS((prev) => (prev.productId ? prev : { ...prev, productId: list[0]?.id ?? '' }));
      })
      .catch((err) => setError(describeError(err)));
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    return () => {
      if (s.photoPreview) URL.revokeObjectURL(s.photoPreview);
    };
  }, [s.photoPreview]);

  const product = products?.find((p) => p.id === s.productId) ?? null;

  function go(next: number) {
    setErrors({});
    setError(null);
    setStep(Math.min(Math.max(next, 1), STEPS.length));
  }

  // ---- Schritt 1 ----
  function nextFromVorhaben() {
    if (!s.projectType) {
      setErrors({ projectType: 'Bitte wähle, was du vorhast.' });
      return;
    }
    go(2);
  }

  // ---- Schritt 2 ----
  function onPhotoChange(file: File | undefined) {
    if (s.photoPreview) URL.revokeObjectURL(s.photoPreview);
    if (!file) {
      update({ photoFile: undefined, photoPreview: undefined, analysis: undefined });
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setErrors({ photo: 'Bitte ein Foto als JPEG, PNG oder WebP wählen.' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrors({ photo: 'Das Foto ist größer als 8 MB. Bitte ein kleineres Foto wählen.' });
      return;
    }
    setErrors({});
    update({ photoFile: file, photoPreview: URL.createObjectURL(file), analysis: undefined });
  }

  async function runAnalysis() {
    if (!s.photoFile) return;
    setBusy('analyze');
    setError(null);
    try {
      const analysis = await analyzePhoto(s.photoFile);
      update({ analysis });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  // ---- Schritt 3 ----
  async function nextFromMasse() {
    const parsed = massenSchema.safeParse(
      s.mode === 'AREA'
        ? { mode: 'AREA', areaM2: s.areaM2, productId: s.productId, postalCode: s.postalCode }
        : { mode: 'LANES', lengthM: s.lengthM, laneCount: s.laneCount, productId: s.productId, postalCode: s.postalCode },
    );
    if (!parsed.success) {
      showErrors(fieldErrors(parsed.error));
      return;
    }
    setBusy('calculate');
    setError(null);
    try {
      const d = parsed.data;
      const result = await calculate({
        projectType: s.projectType!,
        mode: d.mode,
        productId: d.productId,
        postalCode: d.postalCode || undefined,
        ...(d.mode === 'AREA' ? { areaM2: d.areaM2 } : { lengthM: d.lengthM, laneCount: d.laneCount }),
      });
      update({ calculation: result });
      go(4);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  // ---- Schritt 5 ----
  function nextFromKontakt() {
    const parsed = kontaktSchema.safeParse({
      customerName: s.customerName,
      email: s.email,
      phone: s.phone,
      street: s.street,
      postalCode: s.postalCode,
      city: s.city,
      unloading: s.unloading,
      notes: s.notes,
      rentalRequested: s.rentalRequested,
      privacy: s.privacy,
    });
    if (!parsed.success) {
      showErrors(fieldErrors(parsed.error));
      return;
    }
    go(6);
  }

  // ---- Schritt 6 ----
  async function submit() {
    setBusy('submit');
    setError(null);
    try {
      const body: InquiryCreateInput = {
        projectType: s.projectType!,
        mode: s.mode,
        productId: s.productId,
        photoId: s.analysis?.photoId,
        customerName: s.customerName.trim(),
        email: s.email.trim(),
        phone: s.phone.trim() || undefined,
        street: s.street.trim() || undefined,
        postalCode: s.postalCode.trim(),
        city: s.city.trim(),
        unloading: s.unloading!,
        notes: s.notes.trim() || undefined,
        rentalRequested: s.rentalRequested,
        channel: 'WEB',
        ...(s.mode === 'AREA' ? { areaM2: Number(s.areaM2.replace(',', '.')) } : { lengthM: Number(s.lengthM.replace(',', '.')), laneCount: s.laneCount }),
      };
      const res = await createInquiry(body);
      router.push(`/anfrage/${encodeURIComponent(res.id)}`);
    } catch (err) {
      setError(describeError(err));
      setBusy(null);
    }
  }

  const title = STEPS[step - 1];

  return (
    <div className="karte p-5 sm:p-8">
      <StepProgress current={step} onJump={go} />
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {`Schritt ${step}: ${title}`}
      </h2>

      {error && (
        <Notice tone="error" className="mb-6">
          {error}
        </Notice>
      )}

      <motion.div
        key={step}
        initial={reduce ? false : { opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >

      {/* ---------- 1 Vorhaben ---------- */}
      {step === 1 && (
        <section aria-labelledby="s1">
          <h3 id="s1" className="text-2xl sm:text-3xl">
            Was hast du vor?
          </h3>
          <p className="mt-2 text-text">Wähle eine Karte. Die Auswahl hilft uns, Produkt und Mengen richtig einzuordnen.</p>
          <fieldset className="mt-6">
            <legend className="sr-only">Vorhaben</legend>
            <div className="grid gap-4 md:grid-cols-3">
              {PROJECT_OPTIONS.map((o) => (
                <ChoiceCard
                  key={o.value}
                  name="projectType"
                  value={o.value}
                  checked={s.projectType === o.value}
                  onChange={(v) => {
                    update({ projectType: v as ProjectType });
                    setErrors({});
                  }}
                  title={o.title}
                  text={o.text}
                  icon={o.icon}
                />
              ))}
            </div>
            {errors.projectType && (
              <p role="alert" className="mt-3 font-semibold text-fehler">
                {errors.projectType}
              </p>
            )}
          </fieldset>
          <Nav onNext={nextFromVorhaben} />
        </section>
      )}

      {/* ---------- 2 Foto ---------- */}
      {step === 2 && (
        <section aria-labelledby="s2">
          <h3 id="s2" className="text-2xl sm:text-3xl">
            Ein Foto vom Boden (optional)
          </h3>
          <p className="mt-2 text-text">
            Ein Foto hilft bei der Einordnung des Untergrunds. Es ist keine Pflicht – du kannst diesen Schritt überspringen.
          </p>
          <Notice tone="warn" className="mt-4">
            Bitte nur den Boden fotografieren, <strong>keine Personen</strong>. Ortsdaten im Bild werden entfernt. {PRINCIPLES.noSurvey}
          </Notice>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label
                htmlFor="photo-input"
                className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-karte border-2 border-dashed border-gruen/40 bg-salbei/50 p-6 text-center text-gruen hover:bg-salbei has-focus-visible:outline-3 has-focus-visible:outline-terracotta"
              >
                <Camera className="size-10" aria-hidden />
                <span className="font-heading text-lg font-extrabold">Foto aufnehmen oder auswählen</span>
                <span className="text-sm text-text">JPEG, PNG oder WebP, bis 8 MB</span>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => onPhotoChange(e.target.files?.[0])}
                />
              </label>
              <label
                htmlFor="photo-input-gallery"
                className="touch inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-gruen/30 px-4 py-2 font-semibold text-gruen hover:bg-salbei"
              >
                <ImagePlus className="size-5" aria-hidden /> Aus der Galerie wählen
                <input
                  id="photo-input-gallery"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => onPhotoChange(e.target.files?.[0])}
                />
              </label>
              {errors.photo && (
                <p role="alert" className="font-semibold text-fehler">
                  {errors.photo}
                </p>
              )}
            </div>

            <div>
              {s.photoPreview ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-karte">
                    {/* eslint-disable-next-line @next/next/no-img-element -- lokale Blob-Vorschau */}
                    <img src={s.photoPreview} alt="Vorschau deines Fotos vom Untergrund" className="max-h-72 w-full object-cover" />
                    {busy === 'analyze' && (
                      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ ['--scan-h' as string]: 'calc(100% - 4px)' }}>
                        <div className="absolute inset-0 bg-gruen/20" />
                        <div className="scan-line absolute inset-x-0 top-0 h-1 bg-akzent shadow-[0_0_18px_4px_rgba(240,168,90,0.8)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={runAnalysis} loading={busy === 'analyze'} disabled={Boolean(s.analysis)}>
                      {s.analysis ? 'Analysiert' : 'Analysieren'}
                    </Button>
                    <Button variant="ghost" onClick={() => onPhotoChange(undefined)} icon={<Trash2 className="size-5" aria-hidden />}>
                      Foto entfernen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[180px] items-center justify-center rounded-karte bg-sand text-center text-text/70">Hier erscheint die Vorschau.</div>
              )}
            </div>
          </div>

          {s.analysis && (
            <div className="mt-6 rounded-karte border border-salbei-dunkel bg-salbei p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg">Einschätzung des Untergrunds</h4>
                <span className="rounded-full bg-akzent px-2 py-0.5 text-xs font-extrabold text-gruen-dunkel">KI</span>
                <span className="rounded-full bg-white px-3 py-0.5 text-xs font-bold text-terracotta-text">Nur Orientierung</span>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-text">Oberfläche</dt>
                  <dd className="font-semibold text-gruen">{s.analysis.surface}</dd>
                </div>
                <div>
                  <dt className="text-sm text-text">Eignung</dt>
                  <dd className="font-semibold text-gruen">
                    {s.analysis.suitability === 'GOOD' ? 'Gut geeignet' : s.analysis.suitability === 'LIMITED' ? 'Eingeschränkt' : 'Unklar'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text">Sicherheit der Einschätzung</dt>
                  <dd className="font-semibold text-gruen">{Math.round(s.analysis.confidence * 100)} %</dd>
                </div>
              </dl>
              <p className="mt-3 text-text">{s.analysis.notes}</p>
              <p className="mt-2 text-sm text-text/80">{s.analysis.disclosure}</p>
            </div>
          )}

          <Nav onBack={() => go(1)} onNext={() => go(3)} nextLabel={s.photoFile ? 'Weiter' : 'Ohne Foto weiter'} />
        </section>
      )}

      {/* ---------- 3 Maße ---------- */}
      {step === 3 && (
        <section aria-labelledby="s3">
          <h3 id="s3" className="text-2xl sm:text-3xl">
            Wie groß ist die Fläche?
          </h3>
          <p className="mt-2 text-text">Gib die Fläche in Quadratmetern ein. Bei zwei Fahrspuren zählt die Länge der Strecke.</p>

          <fieldset className="mt-6">
            <legend className="mb-3 font-semibold text-gruen">Wie möchtest du messen?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard compact name="mode" value="AREA" checked={s.mode === 'AREA'} onChange={() => update({ mode: 'AREA' })} title="Fläche in m²" text="Länge × Breite der Fläche" />
              <ChoiceCard compact name="mode" value="LANES" checked={s.mode === 'LANES'} onChange={() => update({ mode: 'LANES' })} title="Zwei Fahrspuren" text="Nur die Streckenlänge eingeben" />
            </div>
          </fieldset>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {s.mode === 'AREA' ? (
              <Field label="Fläche in m²" required error={errors.areaM2} hint="Beispiel: 120 für eine Fläche von 10 × 12 Metern">
                {(p) => <Input {...p} inputMode="decimal" placeholder="z. B. 120" value={s.areaM2} onChange={(e) => update({ areaM2: e.target.value })} />}
              </Field>
            ) : (
              <>
                <Field label="Streckenlänge in m" required error={errors.lengthM} hint="Gesamte Länge der Zufahrt">
                  {(p) => <Input {...p} inputMode="decimal" placeholder="z. B. 80" value={s.lengthM} onChange={(e) => update({ lengthM: e.target.value })} />}
                </Field>
                <Field label="Anzahl Fahrspuren" required hint="Standard sind zwei Spuren in Plattenbreite">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min={1}
                      max={4}
                      value={s.laneCount}
                      onChange={(e) => update({ laneCount: Math.min(4, Math.max(1, Number(e.target.value) || 1)) })}
                    />
                  )}
                </Field>
              </>
            )}
            <Field label="Liefer-PLZ" error={errors.postalCode} hint="Für eine erste Einschätzung der Frachtzone">
              {(p) => (
                <Input {...p} inputMode="numeric" maxLength={4} placeholder="z. B. 3362" value={s.postalCode} onChange={(e) => update({ postalCode: e.target.value.replace(/\D/g, '') })} />
              )}
            </Field>
          </div>

          <fieldset className="mt-8">
            <legend className="mb-3 font-semibold text-gruen">
              Produkt <span className="text-terracotta-text">*</span>
            </legend>
            {products === null ? (
              <Spinner label="Produkte werden geladen …" />
            ) : products.length === 0 ? (
              <Notice tone="warn">Derzeit sind keine Produkte hinterlegt. Bitte später erneut versuchen.</Notice>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {products.map((p) => (
                  <ChoiceCard
                    key={p.id}
                    name="productId"
                    value={p.id}
                    checked={s.productId === p.id}
                    onChange={(v) => update({ productId: v })}
                    title={p.name}
                    text={`${p.lengthCm} × ${p.widthCm} cm · ${p.thicknessMm} mm · ${p.weightKg} kg · bis ${p.loadCapacityTons} t · ${p.platesPerPallet} je Palette${p.isPlaceholder ? ' · Platzhalterwerte' : ''}`}
                  />
                ))}
              </div>
            )}
            {products?.some((p) => p.isPlaceholder) && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text">
                <PlaceholderBadge short /> Produktdaten werden vor dem Livebetrieb bestätigt.
              </p>
            )}
            {errors.productId && (
              <p role="alert" className="mt-2 font-semibold text-fehler">
                {errors.productId}
              </p>
            )}
          </fieldset>

          <Nav onBack={() => go(2)} onNext={nextFromMasse} nextLabel="Mengen berechnen" loading={busy === 'calculate'} />
        </section>
      )}

      {/* ---------- 4 Mengen ---------- */}
      {step === 4 && s.calculation && (
        <section aria-labelledby="s4">
          <h3 id="s4" className="text-2xl sm:text-3xl">
            Deine Mengen
          </h3>
          <p className="mt-2 text-text">Berechnet nach festen Regeln von Bodenschutz Austria, nicht von einer KI geschätzt.</p>
          <div className="mt-6">
            <MengenErgebnis result={s.calculation} product={product} />
          </div>
          <Notice tone="info" className="mt-6">
            {PRINCIPLES.noOrder} Das Angebot folgt nach persönlicher Prüfung.
          </Notice>
          <Nav onBack={() => go(3)} onNext={() => go(5)} nextLabel="Angebot anfordern" />
        </section>
      )}

      {/* ---------- 5 Kontakt ---------- */}
      {step === 5 && (
        <section aria-labelledby="s5">
          <h3 id="s5" className="text-2xl sm:text-3xl">
            Wohin soll das Angebot?
          </h3>
          <p className="mt-2 text-text">Kontakt, Lieferort und Entlademöglichkeit. Pflichtfelder sind mit * markiert.</p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Name oder Firma" required error={errors.customerName}>
              {(p) => <Input {...p} autoComplete="name" value={s.customerName} onChange={(e) => update({ customerName: e.target.value })} />}
            </Field>
            <Field label="E-Mail" required error={errors.email}>
              {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={s.email} onChange={(e) => update({ email: e.target.value })} />}
            </Field>
            <Field label="Telefon" error={errors.phone} hint="Für schnelle Rückfragen">
              {(p) => <Input {...p} type="tel" autoComplete="tel" inputMode="tel" value={s.phone} onChange={(e) => update({ phone: e.target.value })} />}
            </Field>
            <Field label="Straße und Hausnummer" error={errors.street}>
              {(p) => <Input {...p} autoComplete="street-address" value={s.street} onChange={(e) => update({ street: e.target.value })} />}
            </Field>
            <Field label="PLZ des Lieferorts" required error={errors.postalCode}>
              {(p) => (
                <Input {...p} inputMode="numeric" maxLength={4} autoComplete="postal-code" value={s.postalCode} onChange={(e) => update({ postalCode: e.target.value.replace(/\D/g, '') })} />
              )}
            </Field>
            <Field label="Ort" required error={errors.city}>
              {(p) => <Input {...p} autoComplete="address-level2" value={s.city} onChange={(e) => update({ city: e.target.value })} />}
            </Field>
          </div>

          <fieldset className="mt-8">
            <legend className="mb-3 font-semibold text-gruen">
              Wie kann vor Ort entladen werden? <span className="text-terracotta-text">*</span>
            </legend>
            <div className="grid gap-3 md:grid-cols-3">
              {UNLOADING_OPTIONS.map((o) => (
                <ChoiceCard
                  key={o.value}
                  name="unloading"
                  value={o.value}
                  checked={s.unloading === o.value}
                  onChange={(v) => update({ unloading: v as Unloading })}
                  title={UNLOADING_LABELS[o.value]}
                  text={o.text}
                  icon={o.icon}
                />
              ))}
            </div>
            {errors.unloading && (
              <p role="alert" className="mt-2 font-semibold text-fehler">
                {errors.unloading}
              </p>
            )}
          </fieldset>

          <div className="mt-8 space-y-6">
            <Field label="Anmerkungen" error={errors.notes} hint="Zeitraum, Zufahrt, Besonderheiten – alles, was uns hilft">
              {(p) => <Textarea {...p} value={s.notes} onChange={(e) => update({ notes: e.target.value })} />}
            </Field>
            <Toggle
              checked={s.rentalRequested}
              onChange={(v) => update({ rentalRequested: v })}
              label="Miete gewünscht"
              description="Mietanfragen werden immer persönlich geprüft."
            />
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={s.privacy}
                onChange={(e) => update({ privacy: e.target.checked })}
                className="mt-1 size-6 shrink-0 accent-gruen"
                aria-invalid={errors.privacy ? true : undefined}
                aria-describedby={errors.privacy ? 'privacy-error' : undefined}
              />
              <span>
                Ich habe die{' '}
                <a href="/datenschutz" target="_blank" rel="noopener" className="font-semibold text-terracotta-text underline underline-offset-2">
                  Datenschutzerklärung
                </a>{' '}
                gelesen und bin mit der Verarbeitung meiner Angaben zur Angebotserstellung einverstanden. <span className="text-terracotta-text">*</span>
              </span>
            </label>
            {errors.privacy && (
              <p id="privacy-error" role="alert" className="-mt-3 font-semibold text-fehler">
                {errors.privacy}
              </p>
            )}
          </div>

          <Nav onBack={() => go(4)} onNext={nextFromKontakt} nextLabel="Zur Übersicht" />
        </section>
      )}

      {/* ---------- 6 Senden ---------- */}
      {step === 6 && (
        <section aria-labelledby="s6">
          <h3 id="s6" className="text-2xl sm:text-3xl">
            Alles richtig? Dann senden.
          </h3>
          <p className="mt-2 text-text">{PRINCIPLES.noOrder} Du bekommst eine Eingangsbestätigung, das Angebot folgt nach Prüfung.</p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Summary title="Vorhaben" onEdit={() => go(1)}>
              {s.projectType ? PROJECT_TYPE_LABELS[s.projectType] : '–'}
            </Summary>
            <Summary title="Foto" onEdit={() => go(2)}>
              {s.photoFile ? (s.analysis ? 'Foto mit KI-Einschätzung' : 'Foto ohne Analyse') : 'Kein Foto'}
            </Summary>
            <Summary title="Maße" onEdit={() => go(3)}>
              {s.mode === 'AREA' ? `${s.areaM2} m² Fläche` : `${s.lengthM} m Strecke, ${s.laneCount} Fahrspuren`} · {product?.name ?? '–'}
            </Summary>
            <Summary title="Mengen" onEdit={() => go(4)}>
              {s.calculation ? `${s.calculation.plates} Platten auf ${s.calculation.pallets} Paletten` : '–'}
            </Summary>
            <Summary title="Kontakt" onEdit={() => go(5)}>
              {s.customerName}
              <br />
              {s.email}
              {s.phone && (
                <>
                  <br />
                  {s.phone}
                </>
              )}
            </Summary>
            <Summary title="Lieferort und Entladung" onEdit={() => go(5)}>
              {s.street && (
                <>
                  {s.street}
                  <br />
                </>
              )}
              {s.postalCode} {s.city}
              <br />
              {s.unloading ? UNLOADING_LABELS[s.unloading] : '–'}
              {s.rentalRequested && ' · Miete gewünscht'}
            </Summary>
          </dl>
          {s.notes && (
            <div className="mt-4 rounded-2xl bg-sand px-5 py-4">
              <p className="text-sm font-semibold text-gruen">Anmerkungen</p>
              <p className="whitespace-pre-wrap">{s.notes}</p>
            </div>
          )}

          <Notice tone="info" className="mt-6">
            {PRINCIPLES.noSurvey} {PRINCIPLES.pricesLater}
          </Notice>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="ghost" size="lg" onClick={() => go(5)} icon={<ArrowLeft className="size-5" aria-hidden />} disabled={busy === 'submit'}>
              Zurück
            </Button>
            <Button size="lg" onClick={submit} loading={busy === 'submit'} icon={<Send className="size-5" aria-hidden />}>
              Anfrage senden
            </Button>
          </div>
        </section>
      )}
      </motion.div>
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel = 'Weiter', loading }: { onBack?: () => void; onNext: () => void; nextLabel?: string; loading?: boolean }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button variant="ghost" size="lg" onClick={onBack} icon={<ArrowLeft className="size-5" aria-hidden />}>
          Zurück
        </Button>
      ) : (
        <span />
      )}
      <Button size="lg" onClick={onNext} loading={loading} icon={<ArrowRight className="size-5" aria-hidden />}>
        {nextLabel}
      </Button>
    </div>
  );
}

function Summary({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="rounded-2xl border border-linie bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-sm font-bold text-terracotta-text">{title}</dt>
        <button type="button" onClick={onEdit} className="touch rounded-full px-2 text-sm font-semibold text-gruen underline underline-offset-2">
          Ändern
        </button>
      </div>
      <dd className="mt-1 text-text-dunkel">{children}</dd>
    </div>
  );
}
