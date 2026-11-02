// Zentraler, typisierter API-Client nach docs/ARCHITEKTUR.md.
// Der Browser spricht same-origin mit /api/... (Rewrite in next.config.ts auf die Fastify-API),
// damit das Admin-Cookie funktioniert. Mit NEXT_PUBLIC_MOCK_API=true kommen Beispieldaten aus lib/mock.ts.

import * as mock from './mock';
import type {
  AdminStats,
  AdminUser,
  ApprovalRule,
  CalculationInput,
  CalculationResult,
  ChatRequest,
  ChatResponse,
  EmailMessage,
  EmailStatus,
  FreightZoneInput,
  FreightZoneSpec,
  Inquiry,
  InquiryCreateInput,
  InquiryCreateResult,
  InquiryPatch,
  InquiryPublic,
  InquiryStatus,
  PhotoAnalysis,
  ProductInput,
  ProductSpec,
  Settings,
} from './types';

export const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_API === 'true';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const GERMAN_ERRORS: Record<number, string> = {
  400: 'Die Eingaben sind unvollständig oder ungültig. Bitte prüfe die Angaben.',
  401: 'Bitte zuerst anmelden.',
  403: 'Dafür fehlt die Berechtigung.',
  404: 'Der Eintrag wurde nicht gefunden.',
  413: 'Die Datei ist zu groß (maximal 8 MB).',
  415: 'Dieses Dateiformat wird nicht unterstützt (JPEG, PNG oder WebP).',
  429: 'Zu viele Anfragen in kurzer Zeit. Bitte kurz warten und erneut versuchen.',
  500: 'Auf dem Server ist ein Fehler aufgetreten. Bitte später erneut versuchen.',
  502: 'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.',
  503: 'Der Dienst ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.',
};

function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    const msg = b.message ?? b.error;
    if (typeof msg === 'string' && msg.trim() && !/^[A-Z_ ]+$/.test(msg)) return msg;
  }
  return GERMAN_ERRORS[status] ?? `Unerwarteter Fehler (${status}).`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.', 0);
  }
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* kein JSON */
    }
    throw new ApiError(errorMessage(res.status, body), res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });
const del: RequestInit = { method: 'DELETE' };

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

// ---- Mock-Zustand (nur im Browser, überlebt Navigation innerhalb der Sitzung) ----
const MOCK_LOGIN_KEY = 'bsa_mock_admin';
function mockLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(MOCK_LOGIN_KEY) === '1';
  } catch {
    return false;
  }
}
function requireMockLogin() {
  if (!mockLoggedIn()) throw new ApiError(GERMAN_ERRORS[401], 401);
}

// ====================== Öffentlich ======================

export async function getHealth(): Promise<{ ok: boolean }> {
  if (IS_MOCK) return { ok: true };
  return request('/health');
}

export async function getProducts(): Promise<ProductSpec[]> {
  if (IS_MOCK) {
    await delay(200);
    return mock.mockProducts.filter((p) => p.active !== false);
  }
  return request('/products');
}

export async function calculate(input: CalculationInput & { productId: string }): Promise<CalculationResult> {
  if (IS_MOCK) {
    await delay();
    const product = mock.mockProducts.find((p) => p.id === input.productId);
    if (!product) throw new ApiError('Produkt nicht gefunden.', 404);
    return mock.mockCalculate(input, product);
  }
  return request('/calculate', json(input));
}

export async function analyzePhoto(file: File | Blob): Promise<PhotoAnalysis> {
  if (IS_MOCK) {
    await delay(1200);
    return mock.mockAnalyzePhoto();
  }
  const form = new FormData();
  form.append('photo', file, file instanceof File ? file.name : 'foto.jpg');
  return request('/photo/analyze', { method: 'POST', body: form });
}

export async function createInquiry(input: InquiryCreateInput): Promise<InquiryCreateResult> {
  if (IS_MOCK) {
    await delay(800);
    return mock.mockCreateInquiry(input);
  }
  return request('/inquiries', json(input));
}

export async function getInquiryPublic(id: string): Promise<InquiryPublic> {
  if (IS_MOCK) {
    await delay(200);
    const i = mock.mockInquiries.find((x) => x.id === id);
    if (!i) throw new ApiError(GERMAN_ERRORS[404], 404);
    return { id: i.id, status: i.status, createdAt: i.createdAt };
  }
  return request(`/inquiries/${encodeURIComponent(id)}/public`);
}

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  if (IS_MOCK) {
    await delay(900);
    return mock.mockChat(req);
  }
  return request('/chat', json(req));
}

// ====================== Verwaltung ======================

export const admin = {
  async login(email: string, password: string): Promise<AdminUser> {
    if (IS_MOCK) {
      await delay();
      if (!email || !password) throw new ApiError('Bitte E-Mail und Passwort eingeben.', 400);
      window.sessionStorage.setItem(MOCK_LOGIN_KEY, '1');
      return { id: 'admin_mock', email };
    }
    return request('/admin/login', json({ email, password }));
  },
  async logout(): Promise<void> {
    if (IS_MOCK) {
      window.sessionStorage.removeItem(MOCK_LOGIN_KEY);
      return;
    }
    await request('/admin/logout', { method: 'POST' });
  },
  async me(): Promise<AdminUser> {
    if (IS_MOCK) {
      await delay(100);
      requireMockLogin();
      return { id: 'admin_mock', email: 'admin@example.com' };
    }
    return request('/admin/me');
  },

  async stats(): Promise<AdminStats> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(200);
      return mock.mockStats();
    }
    return request('/admin/stats');
  },

  async inquiries(params: { status?: InquiryStatus | ''; q?: string } = {}): Promise<Inquiry[]> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(200);
      const q = (params.q ?? '').toLowerCase();
      return mock.mockInquiries.filter(
        (i) =>
          (!params.status || i.status === params.status) &&
          (!q || [i.customerName, i.email, i.city, i.postalCode, i.id].some((v) => v?.toLowerCase().includes(q))),
      );
    }
    const sp = new URLSearchParams();
    if (params.status) sp.set('status', params.status);
    if (params.q) sp.set('q', params.q);
    const qs = sp.toString();
    const res = await request<Inquiry[] | { items: Inquiry[] }>(`/admin/inquiries${qs ? `?${qs}` : ''}`);
    return Array.isArray(res) ? res : res.items;
  },
  async inquiry(id: string): Promise<Inquiry> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(200);
      const i = mock.mockInquiries.find((x) => x.id === id);
      if (!i) throw new ApiError(GERMAN_ERRORS[404], 404);
      return i;
    }
    return request(`/admin/inquiries/${encodeURIComponent(id)}`);
  },
  async patchInquiry(id: string, data: InquiryPatch): Promise<Inquiry> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const i = mock.mockInquiries.find((x) => x.id === id);
      if (!i) throw new ApiError(GERMAN_ERRORS[404], 404);
      Object.assign(i, data, { updatedAt: new Date().toISOString() });
      return i;
    }
    return request(`/admin/inquiries/${encodeURIComponent(id)}`, patch(data));
  },
  async approveSend(id: string): Promise<Inquiry> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(1000);
      const i = mock.mockInquiries.find((x) => x.id === id);
      if (!i) throw new ApiError(GERMAN_ERRORS[404], 404);
      i.status = 'SENT';
      i.sentAt = new Date().toISOString();
      mock.mockEmails.unshift({
        id: `mail_${Date.now()}`,
        direction: 'OUT',
        fromAddress: 'office@bodenschutz-austria.at',
        toAddress: i.email,
        subject: 'Ihr Angebot von Bodenschutz Austria',
        textBody: i.aiDraft ?? '',
        receivedAt: i.sentAt,
        category: null,
        status: 'SENT',
        inquiryId: i.id,
        autoSent: false,
      });
      return i;
    }
    return request(`/admin/inquiries/${encodeURIComponent(id)}/approve-send`, { method: 'POST' });
  },
  async question(id: string, text: string): Promise<Inquiry> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(800);
      const i = mock.mockInquiries.find((x) => x.id === id);
      if (!i) throw new ApiError(GERMAN_ERRORS[404], 404);
      i.status = 'QUESTION';
      return i;
    }
    return request(`/admin/inquiries/${encodeURIComponent(id)}/question`, json({ text }));
  },
  async reject(id: string, reason?: string): Promise<Inquiry> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const i = mock.mockInquiries.find((x) => x.id === id);
      if (!i) throw new ApiError(GERMAN_ERRORS[404], 404);
      i.status = 'REJECTED';
      if (reason) i.adminNotes = `${i.adminNotes ?? ''}\nAbgelehnt: ${reason}`.trim();
      return i;
    }
    return request(`/admin/inquiries/${encodeURIComponent(id)}/reject`, json({ reason }));
  },
  async regenerateDraft(id: string): Promise<Inquiry> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(1500);
      const i = mock.mockInquiries.find((x) => x.id === id);
      if (!i) throw new ApiError(GERMAN_ERRORS[404], 404);
      i.aiDraft = `Sehr geehrte/r ${i.customerName},\n\nvielen Dank für Ihre Anfrage (neu erzeugter Entwurf ${new Date().toLocaleTimeString('de-AT')}). ${
        i.classification === 'STANDARD' ? 'Anbei finden Sie unseren Angebotsentwurf.' : 'Wir haben noch eine Rückfrage zu Ihrem Vorhaben.'
      }\n\nMit freundlichen Grüßen\nBodenschutz Austria\n\nDiese Antwort wurde mit KI-Unterstützung erstellt.`;
      i.status = i.status === 'NEW' ? 'DRAFT' : i.status;
      return i;
    }
    return request(`/admin/inquiries/${encodeURIComponent(id)}/regenerate-draft`, { method: 'POST' });
  },
  photoUrl(id: string): string {
    return `${API_BASE}/admin/inquiries/${encodeURIComponent(id)}/photo`;
  },
  pdfUrl(id: string): string {
    return `${API_BASE}/admin/inquiries/${encodeURIComponent(id)}/pdf`;
  },

  async products(): Promise<ProductSpec[]> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(150);
      return mock.mockProducts;
    }
    return request('/admin/products');
  },
  async createProduct(data: ProductInput): Promise<ProductSpec> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const p = { ...data, id: `prod_${Date.now().toString(36)}` } as ProductSpec;
      mock.mockProducts.push(p);
      return p;
    }
    return request('/admin/products', json(data));
  },
  async updateProduct(id: string, data: ProductInput): Promise<ProductSpec> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const p = mock.mockProducts.find((x) => x.id === id);
      if (!p) throw new ApiError(GERMAN_ERRORS[404], 404);
      Object.assign(p, data, { id });
      return p;
    }
    return request(`/admin/products/${encodeURIComponent(id)}`, put(data));
  },
  async deleteProduct(id: string): Promise<void> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const idx = mock.mockProducts.findIndex((x) => x.id === id);
      if (idx >= 0) mock.mockProducts.splice(idx, 1);
      return;
    }
    await request(`/admin/products/${encodeURIComponent(id)}`, del);
  },

  async freightZones(): Promise<FreightZoneSpec[]> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(150);
      return mock.mockZones;
    }
    const zones = await request<Array<FreightZoneSpec | (Omit<FreightZoneSpec, 'postalPrefixes'> & { postalPrefixes: string })>>(
      '/admin/freight-zones',
    );
    return zones.map((z) => ({
      ...z,
      postalPrefixes: Array.isArray(z.postalPrefixes) ? z.postalPrefixes : String(z.postalPrefixes).split(',').map((s) => s.trim()).filter(Boolean),
    }));
  },
  async createFreightZone(data: FreightZoneInput): Promise<FreightZoneSpec> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const z = { ...data, id: `zone_${Date.now().toString(36)}` } as FreightZoneSpec;
      mock.mockZones.push(z);
      return z;
    }
    return request('/admin/freight-zones', json(data));
  },
  async updateFreightZone(id: string, data: FreightZoneInput): Promise<FreightZoneSpec> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const z = mock.mockZones.find((x) => x.id === id);
      if (!z) throw new ApiError(GERMAN_ERRORS[404], 404);
      Object.assign(z, data, { id });
      return z;
    }
    return request(`/admin/freight-zones/${encodeURIComponent(id)}`, put(data));
  },
  async deleteFreightZone(id: string): Promise<void> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const idx = mock.mockZones.findIndex((x) => x.id === id);
      if (idx >= 0) mock.mockZones.splice(idx, 1);
      return;
    }
    await request(`/admin/freight-zones/${encodeURIComponent(id)}`, del);
  },

  async rules(): Promise<ApprovalRule[]> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(150);
      return mock.mockRules;
    }
    return request('/admin/rules');
  },
  async updateRule(key: string, autoAllowed: boolean): Promise<ApprovalRule> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const r = mock.mockRules.find((x) => x.key === key);
      if (!r) throw new ApiError(GERMAN_ERRORS[404], 404);
      r.autoAllowed = autoAllowed;
      return r;
    }
    return request(`/admin/rules/${encodeURIComponent(key)}`, put({ autoAllowed }));
  },

  async settings(): Promise<Settings> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(150);
      return { ...mock.mockSettings };
    }
    const res = await request<Settings | Array<{ key: string; value: string }>>('/admin/settings');
    if (Array.isArray(res)) return Object.fromEntries(res.map((s) => [s.key, s.value]));
    return res;
  },
  async updateSettings(data: Settings): Promise<Settings> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      Object.assign(mock.mockSettings, data);
      return { ...mock.mockSettings };
    }
    const res = await request<Settings | Array<{ key: string; value: string }>>('/admin/settings', put(data));
    if (Array.isArray(res)) return Object.fromEntries(res.map((s) => [s.key, s.value]));
    return res;
  },

  async emails(status?: EmailStatus | ''): Promise<EmailMessage[]> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(200);
      return mock.mockEmails.filter((e) => !status || e.status === status);
    }
    const res = await request<EmailMessage[] | { items: EmailMessage[] }>(`/admin/emails${status ? `?status=${status}` : ''}`);
    return Array.isArray(res) ? res : res.items;
  },
  async email(id: string): Promise<EmailMessage> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(150);
      const e = mock.mockEmails.find((x) => x.id === id);
      if (!e) throw new ApiError(GERMAN_ERRORS[404], 404);
      return e;
    }
    return request(`/admin/emails/${encodeURIComponent(id)}`);
  },
  async sendEmail(id: string, text?: string): Promise<EmailMessage> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(900);
      const e = mock.mockEmails.find((x) => x.id === id);
      if (!e) throw new ApiError(GERMAN_ERRORS[404], 404);
      e.status = 'SENT';
      if (text) e.aiDraft = text;
      mock.mockEmails.unshift({
        id: `mail_${Date.now()}`,
        direction: 'OUT',
        fromAddress: 'office@bodenschutz-austria.at',
        toAddress: e.fromAddress,
        subject: `AW: ${e.subject}`,
        textBody: text ?? e.aiDraft ?? '',
        receivedAt: new Date().toISOString(),
        category: null,
        status: 'SENT',
        inReplyToId: e.id,
        autoSent: false,
      });
      return e;
    }
    return request(`/admin/emails/${encodeURIComponent(id)}/send`, json(text ? { text } : {}));
  },
  async ignoreEmail(id: string): Promise<EmailMessage> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay();
      const e = mock.mockEmails.find((x) => x.id === id);
      if (!e) throw new ApiError(GERMAN_ERRORS[404], 404);
      e.status = 'IGNORED';
      return e;
    }
    return request(`/admin/emails/${encodeURIComponent(id)}/ignore`, { method: 'POST' });
  },
  async regenerateEmailDraft(id: string): Promise<EmailMessage> {
    if (IS_MOCK) {
      requireMockLogin();
      await delay(1500);
      const e = mock.mockEmails.find((x) => x.id === id);
      if (!e) throw new ApiError(GERMAN_ERRORS[404], 404);
      e.aiDraft = `Guten Tag,\n\nvielen Dank für Ihre Nachricht „${e.subject}“ (neu erzeugter Entwurf). Gern helfen wir weiter – am schnellsten über unseren Online-Berater unter bodenschutz-austria.at/anfrage.\n\nMit freundlichen Grüßen\nBodenschutz Austria`;
      if (e.status === 'NEW') e.status = 'DRAFT';
      return e;
    }
    return request(`/admin/emails/${encodeURIComponent(id)}/regenerate-draft`, { method: 'POST' });
  },
};

export function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Unbekannter Fehler. Bitte erneut versuchen.';
}
