/**
 * Beispieldaten für den Mock-Modus (EXPO_PUBLIC_MOCK_API=true).
 * Die Rechenlogik hier ist nur eine Näherung für die Vorschau in der App.
 * Verbindlich rechnet ausschließlich packages/rules über die API.
 */
import type {
  CalculateRequest,
  CalculationResult,
  ChatRequest,
  ChatResponse,
  InquiryCreateRequest,
  InquiryCreateResponse,
  InquiryPublic,
  PhotoAnalysis,
  PhotoFile,
  ProductSpec,
} from './types';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const mockProducts: ProductSpec[] = [
  {
    id: 'prod_standard',
    name: 'Bodenschutzplatte Standard',
    description: 'Leichte Kunststoffplatte für Fußgänger, Pkw und leichte Baufahrzeuge.',
    material: 'HDPE',
    lengthCm: 240,
    widthCm: 120,
    thicknessMm: 15,
    weightKg: 38,
    platesPerPallet: 25,
    pricePerPlateCents: 9900,
    loadCapacityTons: 20,
    isPlaceholder: true,
  },
  {
    id: 'prod_heavy',
    name: 'Bodenschutzplatte Schwerlast',
    description: 'Verstärkte Platte für Lkw, Kran und schwere Baumaschinen.',
    material: 'HDPE verstärkt',
    lengthCm: 300,
    widthCm: 150,
    thicknessMm: 40,
    weightKg: 130,
    platesPerPallet: 12,
    pricePerPlateCents: 32900,
    loadCapacityTons: 80,
    isPlaceholder: true,
  },
];

const mockZones = [
  { name: 'Zone Ost (PLZ 1–3)', prefixes: ['1', '2', '3'], perPalletCents: 9000, minimumCents: 18000 },
  { name: 'Zone Süd (PLZ 4, 8, 9)', prefixes: ['4', '8', '9'], perPalletCents: 11000, minimumCents: 22000 },
  { name: 'Zone West (PLZ 5, 6)', prefixes: ['5', '6'], perPalletCents: 13000, minimumCents: 26000 },
  { name: 'Zone Vorarlberg (PLZ 7)', prefixes: ['7'], perPalletCents: 15000, minimumCents: 30000 },
];

export function mockCalculate(input: CalculateRequest): CalculationResult {
  const product = mockProducts.find((p) => p.id === input.productId) ?? mockProducts[0];
  const wasteFactor = input.wasteFactor ?? 1.05;
  const assumptions: string[] = [];

  let areaM2: number;
  if (input.mode === 'LANES') {
    const laneCount = input.laneCount ?? 2;
    const laneWidthM = input.laneWidthM ?? product.widthCm / 100;
    areaM2 = (input.lengthM ?? 0) * laneWidthM * laneCount;
    assumptions.push(
      `${laneCount} Fahrspuren mit je ${laneWidthM.toFixed(2).replace('.', ',')} m Breite (eine Plattenbreite).`
    );
  } else {
    areaM2 = input.areaM2 ?? 0;
  }
  assumptions.push(`${Math.round((wasteFactor - 1) * 100)} % Verschnitt und Überlappung eingerechnet.`);

  const plateArea = (product.lengthCm / 100) * (product.widthCm / 100);
  const plates = Math.max(0, Math.ceil((areaM2 * wasteFactor) / plateArea));
  const pallets = Math.ceil(plates / product.platesPerPallet);
  const weightKg = plates * product.weightKg;
  assumptions.push(`${product.platesPerPallet} Platten je Palette, ${product.weightKg} kg je Platte.`);

  const result: CalculationResult = { areaM2: Math.round(areaM2 * 10) / 10, plates, pallets, weightKg, assumptions };

  if (pallets > 1 && plates % product.platesPerPallet !== 0) {
    const altPallets = pallets - 1;
    const altPlates = altPallets * product.platesPerPallet;
    result.alternative = {
      pallets: altPallets,
      plates: altPlates,
      coveredAreaM2: Math.round(((altPlates * plateArea) / wasteFactor) * 10) / 10,
      note: 'Mit einer Palette weniger lässt sich eine etwas kleinere Fläche abdecken.',
    };
  }

  const platesCents = plates * product.pricePerPlateCents;
  const zone = input.postalCode ? mockZones.find((z) => z.prefixes.includes(input.postalCode![0])) : undefined;
  if (zone) {
    const freightCents = Math.max(zone.minimumCents, pallets * zone.perPalletCents);
    result.pricing = {
      platesCents,
      freightCents,
      totalCents: platesCents + freightCents,
      isPreliminary: true,
      hasPlaceholderData: true,
      freightZone: zone.name,
    };
    assumptions.push(`Fracht nach ${zone.name} (Platzhalterpreise).`);
  } else {
    result.pricing = {
      platesCents,
      freightCents: 0,
      totalCents: platesCents,
      isPreliminary: true,
      hasPlaceholderData: true,
    };
    assumptions.push('Fracht noch nicht enthalten: Postleitzahl fehlt oder Zone unbekannt.');
  }
  return result;
}

export async function mockAnalyzePhoto(_photo: PhotoFile): Promise<PhotoAnalysis> {
  await delay(1800);
  return {
    photoId: `photo_${Date.now().toString(36)}`,
    surface: 'Wiese, leicht feucht, eben',
    suitability: 'GOOD',
    notes:
      'Der Untergrund wirkt eben und bewachsen. Für Standardplatten voraussichtlich geeignet. Bei Nässe oder weichem Boden bitte Tragfähigkeit vor Ort prüfen.',
    confidence: 0.72,
    isOrientationOnly: true,
    disclosure: 'Diese Einschätzung stammt von einem KI-System und dient nur der Orientierung.',
  };
}

const mockInquiries = new Map<string, InquiryPublic>();

export async function mockCreateInquiry(body: InquiryCreateRequest): Promise<InquiryCreateResponse> {
  await delay(1200);
  const id = `c${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
  const calculation = mockCalculate({ ...body, productId: body.productId });
  const reasons: string[] = [];
  if (body.rentalRequested) reasons.push('Miete gewünscht');
  if (body.unloading !== 'FORKLIFT') reasons.push('Entladung unklar oder Kran nötig');
  if (calculation.pallets > 10) reasons.push('Mehr als 10 Paletten');
  if (calculation.areaM2 > 500) reasons.push('Fläche über 500 m²');
  if (body.notes && /sonder|rabatt|miete|dringend|mehrere/i.test(body.notes)) reasons.push('Sonderwunsch im Freitext');
  const classification = reasons.length > 0 ? 'REVIEW' : 'STANDARD';
  mockInquiries.set(id, { id, status: 'NEW', createdAt: new Date().toISOString() });
  return {
    id,
    status: 'NEW',
    classification,
    reviewReasons: reasons,
    calculation,
    message:
      classification === 'STANDARD'
        ? 'Vielen Dank! Ihre Anfrage ist eingegangen. Wir bereiten ein Angebot vor und melden uns per E-Mail.'
        : 'Vielen Dank! Ihre Anfrage wird persönlich geprüft. Wir melden uns per E-Mail, gegebenenfalls mit einer Rückfrage.',
  };
}

export async function mockInquiryStatus(id: string): Promise<InquiryPublic> {
  await delay(500);
  return mockInquiries.get(id) ?? { id, status: 'NEW', createdAt: new Date().toISOString() };
}

export async function mockChat(body: ChatRequest): Promise<ChatResponse> {
  await delay(900);
  const last =
    body.messages
      .filter((m) => m.role === 'user')
      .at(-1)
      ?.content.toLowerCase() ?? '';
  let reply: string;
  if (/preis|kost|euro|€/.test(last)) {
    reply =
      'Verbindliche Preise kann ich nicht nennen. Der Rechner in der App zeigt eine vorläufige Schätzung. Das endgültige Angebot prüft Mario persönlich.';
  } else if (/miet|leih/.test(last)) {
    reply =
      'Miete ist möglich, aber immer ein Sonderfall. Das prüft Mario persönlich, bitte Anfrage senden und „Miete“ ankreuzen.';
  } else if (/entlad|stapler|kran|liefer/.test(last)) {
    reply =
      'Die Platten kommen auf Paletten per Lkw. Vor Ort braucht es einen Stapler oder einen Kran. Wenn das unklar ist, wählen Sie in der Anfrage einfach „Noch unklar“, dann klären wir das gemeinsam.';
  } else if (/baustelle|veranstaltung|paddock|welche platte|produkt/.test(last)) {
    reply =
      'Für Fußgänger, Pkw und leichte Fahrzeuge reicht meist die Standardplatte. Für Lkw, Kran oder schwere Maschinen empfiehlt sich die Schwerlastplatte. Die Tragfähigkeit hängt immer auch vom Untergrund ab, das prüfen wir vor dem Angebot.';
  } else if (/hallo|servus|grüß|hi\b/.test(last)) {
    reply =
      'Hallo! Ich helfe bei Fragen zu Bodenschutzplatten, Verlegung, Entladung und zum Ablauf der Anfrage. Was möchten Sie wissen?';
  } else {
    reply =
      'Dazu kann ich im Moment nichts Verbindliches sagen. Am einfachsten starten Sie eine Anfrage mit Ihren Maßen, dann bekommen Sie eine vorläufige Mengenberechnung und Mario meldet sich nach der Prüfung.';
  }
  return {
    sessionId: body.sessionId ?? `sess_${Date.now().toString(36)}`,
    reply,
    disclosure:
      'Hinweis: Diese Antwort stammt von einem KI-Assistenten. Verbindliche Angaben folgen nach persönlicher Prüfung.',
  };
}
