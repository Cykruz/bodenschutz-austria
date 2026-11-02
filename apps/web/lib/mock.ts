// Beispieldaten für den Mock-Modus (NEXT_PUBLIC_MOCK_API=true).
// Rechenlogik hier ist nur eine Nachbildung für die Oberfläche; verbindlich ist packages/rules über die API.

import type {
  AdminStats,
  ApprovalRule,
  CalculationInput,
  CalculationResult,
  ChatRequest,
  ChatResponse,
  Classification,
  EmailMessage,
  FreightZoneSpec,
  Inquiry,
  InquiryCreateInput,
  InquiryCreateResult,
  PhotoAnalysis,
  ProductSpec,
  Settings,
} from './types';

const DISCLOSURE = 'Diese Antwort stammt von einem KI-Assistenten von Bodenschutz Austria. Mengen und Preise kommen aus festen Regeln, verbindlich wird es erst nach Prüfung durch einen Menschen.';

export const mockProducts: ProductSpec[] = [
  {
    id: 'prod_classicxtreme',
    slug: 'classicxtreme',
    name: 'classicXtreme',
    description: 'Schwerlast-Bodenschutzplatte aus 100 % Recycling-Kunststoff. Für Baustellen, Veranstaltungen und Paddocks.',
    material: '100 % Recycling-Kunststoff (HDPE)',
    lengthCm: 240,
    widthCm: 120,
    thicknessMm: 15,
    weightKg: 38,
    platesPerPallet: 25,
    pricePerPlateCents: 0,
    loadCapacityTons: 40,
    isPlaceholder: true,
    active: true,
    sortOrder: 1,
  },
  {
    id: 'prod_classiclight',
    slug: 'classiclight',
    name: 'classicLight',
    description: 'Leichtere Platte für Fußgängerwege, Rasenschutz und leichte Fahrzeuge.',
    material: '100 % Recycling-Kunststoff (HDPE)',
    lengthCm: 200,
    widthCm: 100,
    thicknessMm: 10,
    weightKg: 20,
    platesPerPallet: 40,
    pricePerPlateCents: 0,
    loadCapacityTons: 10,
    isPlaceholder: true,
    active: true,
    sortOrder: 2,
  },
];

export const mockZones: FreightZoneSpec[] = [
  { id: 'zone_ost', name: 'Zone Ost (Wien, NÖ, Bgld)', postalPrefixes: ['1', '2', '3', '7'], pricePerPalletCents: 4500, minimumCents: 12000, isPlaceholder: true },
  { id: 'zone_sued', name: 'Zone Süd (Stmk, Ktn)', postalPrefixes: ['8', '9'], pricePerPalletCents: 5500, minimumCents: 14000, isPlaceholder: true },
  { id: 'zone_mitte', name: 'Zone Mitte (OÖ, Sbg)', postalPrefixes: ['4', '5'], pricePerPalletCents: 5000, minimumCents: 13000, isPlaceholder: true },
  { id: 'zone_west', name: 'Zone West (Tirol, Vbg)', postalPrefixes: ['6'], pricePerPalletCents: 7000, minimumCents: 18000, isPlaceholder: true },
];

export const mockRules: ApprovalRule[] = [
  { key: 'inquiry_confirmation', label: 'Eingangsbestätigung an Kunden', description: 'Nach einer neuen Anfrage automatisch eine Eingangsbestätigung per E-Mail senden.', autoAllowed: false },
  { key: 'standard_offer_send', label: 'Angebot für Standardfälle automatisch senden', description: 'Vollständige Standardanfragen ohne Sonderwünsche automatisch mit Angebotsentwurf beantworten.', autoAllowed: false },
  { key: 'standard_email_reply', label: 'Standard-E-Mails automatisch beantworten', description: 'Eingehende Kunden-E-Mails, die als Standardfall eingestuft wurden, automatisch beantworten.', autoAllowed: false },
];

export const mockSettings: Settings = {
  autoSendEnabled: 'false',
  maxStandardAreaM2: '500',
  maxStandardPallets: '10',
  wasteFactor: '1.05',
  companyName: 'Bodenschutz Austria',
  companyEmail: 'info@bodenschutz-austria.at',
  companyPhone: '+43 660 7602201',
};

export function mockCalculate(input: CalculationInput, product: ProductSpec, zones: FreightZoneSpec[] = mockZones): CalculationResult {
  const waste = input.wasteFactor ?? 1.05;
  const plateAreaM2 = (product.lengthCm / 100) * (product.widthCm / 100);
  const assumptions: string[] = [];
  let areaM2: number;
  if (input.mode === 'LANES') {
    const laneWidth = input.laneWidthM ?? product.widthCm / 100;
    const laneCount = input.laneCount ?? 2;
    areaM2 = (input.lengthM ?? 0) * laneWidth * laneCount;
    assumptions.push(`${laneCount} Fahrspuren à ${laneWidth.toFixed(2).replace('.', ',')} m Breite (Plattenbreite)`);
  } else {
    areaM2 = input.areaM2 ?? 0;
  }
  assumptions.push(`${Math.round((waste - 1) * 100)} % Verschnitt und Überlappung eingerechnet`);
  assumptions.push(`Plattenmaß ${product.lengthCm} × ${product.widthCm} cm (${plateAreaM2.toFixed(2).replace('.', ',')} m² je Platte)`);
  const plates = Math.max(0, Math.ceil((areaM2 * waste) / plateAreaM2));
  const pallets = Math.ceil(plates / product.platesPerPallet);
  const weightKg = plates * product.weightKg;
  const result: CalculationResult = { areaM2, plates, pallets, weightKg, assumptions };
  if (pallets > 1 && plates % product.platesPerPallet !== 0) {
    const altPallets = pallets - 1;
    const altPlates = altPallets * product.platesPerPallet;
    result.alternative = {
      pallets: altPallets,
      plates: altPlates,
      coveredAreaM2: Math.floor((altPlates * plateAreaM2) / waste),
      note: `Mit ${altPallets} ${altPallets === 1 ? 'vollen Palette' : 'vollen Paletten'} lassen sich etwa ${Math.floor((altPlates * plateAreaM2) / waste)} m² abdecken.`,
    };
  }
  if (product.pricePerPlateCents > 0) {
    const zone = zones
      .filter((z) => z.postalPrefixes.some((p) => (input.postalCode ?? '').startsWith(p)))
      .sort((a, b) => Math.max(...b.postalPrefixes.map((p) => p.length)) - Math.max(...a.postalPrefixes.map((p) => p.length)))[0];
    const platesCents = plates * product.pricePerPlateCents;
    const freightCents = zone ? Math.max(zone.minimumCents, pallets * zone.pricePerPalletCents) : 0;
    result.pricing = {
      platesCents,
      freightCents,
      totalCents: platesCents + freightCents,
      isPreliminary: true,
      hasPlaceholderData: product.isPlaceholder || (zone?.isPlaceholder ?? false),
      freightZone: zone?.name,
    };
    if (zone) assumptions.push(`Frachtzone ${zone.name}`);
  } else {
    assumptions.push('Preis folgt nach Prüfung (noch keine freigegebenen Preisdaten)');
  }
  return result;
}

export function mockAnalyzePhoto(): PhotoAnalysis {
  return {
    photoId: `photo_${Math.random().toString(36).slice(2, 10)}`,
    surface: 'Rasen, leicht uneben, feucht',
    suitability: 'GOOD',
    notes: 'Der Untergrund wirkt eben und bewachsen. Weiche oder stark aufgeweichte Stellen vor der Verlegung prüfen.',
    confidence: 0.72,
    isOrientationOnly: true,
    disclosure: 'Diese Einschätzung stammt von einer KI und dient nur der Orientierung. Sie ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit.',
  };
}

const calcBaustelle = mockCalculate({ projectType: 'CONSTRUCTION', mode: 'AREA', areaM2: 180, postalCode: '3362' }, mockProducts[0]);
const calcEvent = mockCalculate({ projectType: 'EVENT', mode: 'LANES', lengthM: 120, laneCount: 2, postalCode: '1100' }, mockProducts[0]);
const calcPaddock = mockCalculate({ projectType: 'PADDOCK', mode: 'AREA', areaM2: 650, postalCode: '8010' }, mockProducts[0]);

export const mockInquiries: Inquiry[] = [
  {
    id: 'inq_demo_001',
    createdAt: '2026-11-01T08:12:00.000Z',
    updatedAt: '2026-11-01T08:12:00.000Z',
    channel: 'WEB',
    status: 'DRAFT',
    projectType: 'CONSTRUCTION',
    mode: 'AREA',
    areaM2: 180,
    productId: 'prod_classicxtreme',
    product: mockProducts[0],
    photoPath: 'uploads/demo.jpg',
    photoAnalysis: mockAnalyzePhoto(),
    calculation: calcBaustelle,
    classification: 'STANDARD',
    reviewReasons: [],
    customerName: 'Max Mustermann',
    email: 'max@example.at',
    phone: '+43 664 1234567',
    street: 'Hauptstraße 12',
    postalCode: '3362',
    city: 'Mauer',
    unloading: 'FORKLIFT',
    notes: 'Zufahrt für Betonmischer, Einsatz ca. 3 Wochen.',
    rentalRequested: false,
    aiDraft:
      'Sehr geehrter Herr Mustermann,\n\nvielen Dank für Ihre Anfrage über unseren Online-Berater. Für Ihre Baustellenzufahrt mit rund 180 m² haben wir folgende Mengen vorbereitet: 66 Platten classicXtreme auf 3 Paletten.\n\nDer Preis folgt nach Prüfung Ihrer Angaben. Die Lieferung erfolgt per Spedition; ein Stapler ist laut Ihrer Angabe vor Ort vorhanden.\n\nMit freundlichen Grüßen\nBodenschutz Austria\n\nDiese Antwort wurde mit KI-Unterstützung erstellt und vor dem Versand von einem Menschen geprüft.',
    adminNotes: '',
    aiDisclosureShown: true,
  },
  {
    id: 'inq_demo_002',
    createdAt: '2026-11-01T14:40:00.000Z',
    updatedAt: '2026-11-01T14:40:00.000Z',
    channel: 'APP',
    status: 'NEW',
    projectType: 'EVENT',
    mode: 'LANES',
    lengthM: 120,
    laneWidthM: 1.2,
    laneCount: 2,
    productId: 'prod_classicxtreme',
    product: mockProducts[0],
    calculation: calcEvent,
    classification: 'REVIEW',
    reviewReasons: ['Entladung unklar', 'Freitext enthält Sonderwunsch-Signal („dringend“)'],
    customerName: 'Verein Stadtfest Wien',
    email: 'orga@stadtfest-beispiel.at',
    postalCode: '1100',
    city: 'Wien',
    unloading: 'UNKNOWN',
    notes: 'Event-Weg über Rasenfläche, dringend bis Freitag.',
    rentalRequested: true,
    aiDraft:
      'Guten Tag,\n\nvielen Dank für Ihre Anfrage. Damit wir Ihr Angebot vorbereiten können, hätten wir zwei Rückfragen: Steht vor Ort ein Stapler zur Verfügung oder wird ein Kran benötigt? Und soll die Anlage gemietet oder gekauft werden?\n\nMit freundlichen Grüßen\nBodenschutz Austria',
    aiDisclosureShown: true,
  },
  {
    id: 'inq_demo_003',
    createdAt: '2026-10-29T10:05:00.000Z',
    updatedAt: '2026-10-30T09:00:00.000Z',
    channel: 'WEB',
    status: 'SENT',
    projectType: 'PADDOCK',
    mode: 'AREA',
    areaM2: 650,
    productId: 'prod_classicxtreme',
    product: mockProducts[0],
    calculation: calcPaddock,
    classification: 'REVIEW',
    reviewReasons: ['Fläche über Grenzwert (650 m² > 500 m²)'],
    customerName: 'Reitstall Sonnenhof',
    email: 'office@sonnenhof-beispiel.at',
    phone: '+43 316 000000',
    street: 'Am Hof 3',
    postalCode: '8010',
    city: 'Graz',
    unloading: 'CRANE_NEEDED',
    notes: '',
    rentalRequested: false,
    aiDraft: 'Angebot wurde gesendet.',
    sentAt: '2026-10-30T09:00:00.000Z',
    aiDisclosureShown: true,
  },
];

export const mockEmails: EmailMessage[] = [
  {
    id: 'mail_001',
    direction: 'IN',
    fromAddress: 'anna@example.at',
    toAddress: 'info@bodenschutz-austria.at',
    subject: 'Frage zu Platten für Paddock',
    textBody: 'Hallo, wir haben einen Paddock mit ca. 300 m², der im Winter immer matschig ist. Was würden Sie empfehlen und wie läuft die Lieferung?',
    receivedAt: '2026-11-02T07:30:00.000Z',
    category: 'STANDARD',
    aiDraft:
      'Guten Tag,\n\nvielen Dank für Ihre Nachricht. Für einen matschigen Paddock mit rund 300 m² eignen sich unsere classicXtreme-Platten aus Recycling-Kunststoff. Die Lieferung erfolgt per Spedition auf Paletten; dafür brauchen wir die Entlademöglichkeit vor Ort. Am einfachsten geht es über unseren Online-Berater auf bodenschutz-austria.at/anfrage.\n\nMit freundlichen Grüßen\nBodenschutz Austria',
    status: 'DRAFT',
    autoSent: false,
  },
  {
    id: 'mail_002',
    direction: 'IN',
    fromAddress: 'einkauf@bau-beispiel.at',
    toAddress: 'info@bodenschutz-austria.at',
    subject: 'Rahmenvertrag für mehrere Baustellen',
    textBody: 'Wir hätten Interesse an einem Rahmenvertrag für 5 Baustellen in NÖ mit Rabattstaffel. Bitte um Rückruf.',
    receivedAt: '2026-11-02T09:10:00.000Z',
    category: 'REVIEW',
    aiDraft: null,
    status: 'NEW',
    autoSent: false,
  },
  {
    id: 'mail_003',
    direction: 'OUT',
    fromAddress: 'office@bodenschutz-austria.at',
    toAddress: 'office@sonnenhof-beispiel.at',
    subject: 'Ihr Angebot von Bodenschutz Austria',
    textBody: 'Sehr geehrte Damen und Herren, anbei Ihr Angebot als PDF ...',
    receivedAt: '2026-10-30T09:00:00.000Z',
    category: null,
    status: 'SENT',
    inquiryId: 'inq_demo_003',
    autoSent: false,
  },
  {
    id: 'mail_004',
    direction: 'IN',
    fromAddress: 'newsletter@werbung-beispiel.com',
    toAddress: 'info@bodenschutz-austria.at',
    subject: 'Ihr Gratis-Gewinn wartet',
    textBody: 'Werbung ...',
    receivedAt: '2026-11-01T22:00:00.000Z',
    category: 'UNRELATED',
    status: 'IGNORED',
    autoSent: false,
  },
];

export function mockStats(): AdminStats {
  const inquiries: Record<string, number> = { total: mockInquiries.length };
  for (const i of mockInquiries) inquiries[i.status] = (inquiries[i.status] ?? 0) + 1;
  const emails: Record<string, number> = { total: mockEmails.length };
  for (const e of mockEmails) emails[e.status] = (emails[e.status] ?? 0) + 1;
  return { inquiries, emails };
}

export function mockCreateInquiry(input: InquiryCreateInput): InquiryCreateResult {
  const product = mockProducts.find((p) => p.id === input.productId) ?? mockProducts[0];
  const calculation = mockCalculate(input, product);
  const reasons: string[] = [];
  if (input.rentalRequested) reasons.push('Miete gewünscht');
  if (input.unloading !== 'FORKLIFT') reasons.push(input.unloading === 'CRANE_NEEDED' ? 'Kran nötig' : 'Entladung unklar');
  if (calculation.areaM2 > 500) reasons.push('Fläche über Grenzwert');
  if (calculation.pallets > 10) reasons.push('Paletten über Grenzwert');
  if (/sonder|rabatt|dringend|miete|mehrere/i.test(input.notes ?? '')) reasons.push('Freitext enthält Sonderwunsch-Signal');
  const classification: Classification = reasons.length ? 'REVIEW' : 'STANDARD';
  const id = `inq_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  mockInquiries.unshift({
    id,
    createdAt: now,
    updatedAt: now,
    channel: input.channel,
    status: 'NEW',
    projectType: input.projectType,
    mode: input.mode,
    areaM2: input.areaM2,
    lengthM: input.lengthM,
    laneWidthM: input.laneWidthM,
    laneCount: input.laneCount,
    productId: product.id,
    product,
    calculation,
    classification,
    reviewReasons: reasons,
    customerName: input.customerName,
    email: input.email,
    phone: input.phone,
    street: input.street,
    postalCode: input.postalCode,
    city: input.city,
    unloading: input.unloading,
    notes: input.notes,
    rentalRequested: Boolean(input.rentalRequested),
    aiDraft: null,
    aiDisclosureShown: true,
  });
  return {
    id,
    status: 'NEW',
    classification,
    reviewReasons: reasons,
    calculation,
    message:
      classification === 'STANDARD'
        ? 'Danke! Deine Anfrage ist eingegangen. Das Angebot folgt nach Prüfung.'
        : 'Danke! Deine Anfrage ist eingegangen und wird persönlich geprüft.',
  };
}

export function mockChat(req: ChatRequest): ChatResponse {
  const last = [...req.messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? '';
  let reply: string;
  if (/lkw|tonnen|traglast|hält/.test(last)) {
    reply = 'Die classicXtreme-Platte ist für Schwerlast ausgelegt; der Hersteller nennt über 40 Tonnen Traglast. Ob der Untergrund darunter trägt, muss vor Ort geprüft werden. Eine verbindliche Zusage zur Tragfähigkeit kann ich nicht geben – das prüft Mario persönlich.';
  } else if (/liefer|versand|transport|entlad/.test(last)) {
    reply = 'Die Platten kommen auf Paletten per Spedition. Entscheidend ist die Entlademöglichkeit vor Ort: Stapler vorhanden, Kran nötig oder noch unklar. Das fragen wir im Assistenten unter /anfrage ab; Liefertermine werden nach Prüfung bestätigt.';
  } else if (/preis|kost|euro|€|rabatt/.test(last)) {
    reply = 'Verbindliche Preise kann ich nicht nennen. Der Assistent berechnet Platten und Paletten nach festen Regeln, der Preis folgt im persönlichen Angebot nach Prüfung. Rabatte oder Sonderkonditionen prüft Mario persönlich – bitte Anfrage senden.';
  } else if (/miet|leih/.test(last)) {
    reply = 'Mietanfragen sind möglich und werden immer persönlich geprüft. Setze im Assistenten einfach den Schalter „Miete gewünscht“ und beschreibe kurz den Zeitraum.';
  } else {
    reply = 'Gern helfe ich bei Fragen zu Bodenschutzplatten, Einsatzzwecken, Verlegung, Entladung und Ablauf. Für Mengen und ein Angebot nutze am besten den Assistenten unter /anfrage. Verbindliche Preise, Lieferzeiten oder Tragfähigkeitszusagen gibt es erst nach Prüfung durch Mario.';
  }
  return { sessionId: req.sessionId ?? `sess_${Math.random().toString(36).slice(2, 10)}`, reply, disclosure: DISCLOSURE };
}

export const mockDisclosure = DISCLOSURE;
